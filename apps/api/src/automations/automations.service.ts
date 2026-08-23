import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { EventsService, DomainEvent } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';

export interface RuleCondition {
  field: string;
  op: 'eq' | 'neq' | 'in';
  value: unknown;
}

export interface RuleAction {
  type: 'notify' | 'webhook';
  /** notify: message template; {field} placeholders resolve from the event payload */
  message?: string;
  /** notify: restrict to members holding this role; omit = org-wide ops roles */
  recipientRole?: string;
  /** webhook: event name forwarded to integration subscriptions */
  event?: string;
}

export interface AutomationRuleRow {
  id: string;
  org_id: string;
  name: string;
  trigger_event: string;
  condition: RuleCondition[];
  action: RuleAction;
  active: boolean;
  created_at: string;
}

function matches(conditions: RuleCondition[], payload: Record<string, unknown>): boolean {
  return conditions.every((c) => {
    const actual = payload[c.field];
    switch (c.op) {
      case 'eq': return actual === c.value;
      case 'neq': return actual !== c.value;
      case 'in': return Array.isArray(c.value) && c.value.includes(actual);
      default: return false;
    }
  });
}

function render(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(payload[k] ?? ''));
}

/**
 * P6-08 automation builder: rules → triggers → actions. Rules are evaluated
 * against the domain event bus; every evaluation (matched or not) is recorded
 * in automation_run for auditability. V1 actions: notify (in-app) and webhook
 * (via the integrations hub, which delivers through the worker queue).
 */
@Injectable()
export class AutomationsService implements OnModuleInit {
  constructor(
    private readonly db: Database,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
    private readonly integrations: IntegrationsService,
  ) {}

  onModuleInit() {
    this.events.subscribe((e) => {
      this.evaluate(e).catch(() => undefined);
    });
  }

  async list(orgId: string): Promise<AutomationRuleRow[]> {
    const { rows } = await this.db.query<AutomationRuleRow>(
      'SELECT * FROM automation_rule WHERE org_id = $1 ORDER BY created_at',
      [orgId],
    );
    return rows;
  }

  async create(orgId: string, actorId: string, name: string, triggerEvent: string, condition: RuleCondition[], action: RuleAction) {
    return this.db.one(
      `INSERT INTO automation_rule (id, org_id, name, trigger_event, condition, action, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, trigger_event, condition, action, active`,
      [randomUUID(), orgId, name, triggerEvent, JSON.stringify(condition), JSON.stringify(action), actorId] as never[],
    );
  }

  async setActive(orgId: string, id: string, active: boolean) {
    return this.db.oneOrNull(
      'UPDATE automation_rule SET active = $3 WHERE id = $1 AND org_id = $2 RETURNING id, name, active',
      [id, orgId, active] as never[],
    );
  }

  async runs(orgId: string, ruleId?: string) {
    const params: unknown[] = [orgId];
    let sql = 'SELECT * FROM automation_run WHERE org_id = $1';
    if (ruleId) { params.push(ruleId); sql += ` AND rule_id = $${params.length}`; }
    const { rows } = await this.db.query(`${sql} ORDER BY created_at DESC LIMIT 100`, params);
    return rows;
  }

  /** Evaluate all active rules for an event; record each evaluation. */
  async evaluate(e: DomainEvent): Promise<void> {
    const { rows } = await this.db.query<AutomationRuleRow>(
      'SELECT * FROM automation_rule WHERE org_id = $1 AND trigger_event = $2 AND active = true',
      [e.orgId, e.event],
    );
    for (const rule of rows) {
      const matched = matches(rule.condition ?? [], e.payload);
      let detail: Record<string, unknown> = {};
      if (matched) {
        detail = await this.execute(rule, e);
      }
      await this.db.query(
        'INSERT INTO automation_run (id, org_id, rule_id, event, matched, detail) VALUES ($1,$2,$3,$4,$5,$6)',
        [randomUUID(), e.orgId, rule.id, e.event, matched, JSON.stringify(detail)],
      );
    }
  }

  private async execute(rule: AutomationRuleRow, e: DomainEvent): Promise<Record<string, unknown>> {
    const action = rule.action;
    if (action.type === 'notify') {
      const message = render(action.message ?? rule.name, e.payload);
      const recipients = await this.recipients(e.orgId, action.recipientRole);
      for (const r of recipients) {
        await this.notifications.emit(e.orgId, r, 'automation', 'automation_rule', rule.id, message);
      }
      return { action: 'notify', recipients: recipients.length };
    }
    if (action.type === 'webhook') {
      const attempted = await this.integrations.emit(e.orgId, action.event ?? e.event, e.payload);
      return { action: 'webhook', attempted };
    }
    return { action: 'unknown' };
  }

  private async recipients(orgId: string, role?: string): Promise<string[]> {
    if (role) {
      const { rows } = await this.db.query<{ person_id: string }>(
        `SELECT rb.person_id FROM role_binding rb JOIN person p ON p.id = rb.person_id
         WHERE p.org_id = $1 AND rb.role = $2`,
        [orgId, role],
      );
      return rows.map((r) => r.person_id);
    }
    const { rows } = await this.db.query<{ person_id: string }>(
      `SELECT rb.person_id FROM role_binding rb JOIN person p ON p.id = rb.person_id
       WHERE p.org_id = $1 AND rb.role IN ('operations_director', 'production_lead')`,
      [orgId],
    );
    return rows.map((r) => r.person_id);
  }
}
