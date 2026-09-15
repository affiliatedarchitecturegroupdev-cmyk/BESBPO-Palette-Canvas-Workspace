import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AGENT_CATALOG, AgentAutonomy, UserContext } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { LlmProvider } from '../llm/llm.provider';

export interface AgentRunRow {
  id: string;
  org_id: string;
  agent_key: string;
  autonomy: string;
  engagement_id: string | null;
  item_id: string | null;
  status: string;
  input: Record<string, unknown>;
  proposal: Record<string, unknown>;
  decided_by: string | null;
  decided_at: string | null;
}

/**
 * AI agent governance (spec §12).
 *
 * The architecture rule is absolute: no agent is ever the final word on
 * quality, compliance or a commercial decision. Agent output arrives as a
 * *proposal* attached to the item, a named person confirms or rejects it, and
 * the decision is recorded. The only agent that may change state without
 * approval is the reminder agent, and the only agent that may block is the
 * compliance guard — neither can approve.
 */
@Injectable()
export class AgentsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly llm: LlmProvider,
  ) {}

  /** The catalog, with each agent's declared autonomy (spec §12.2). */
  catalog() {
    return {
      provider: { name: this.llm.name, model: this.llm.model, configured: this.llm.isConfigured() },
      agents: AGENT_CATALOG.map((a) => ({
        key: a.key,
        name: a.name,
        autonomy: a.autonomy,
        summary: a.summary,
        requiresApproval: a.requiresApproval,
        reads: a.reads,
      })),
    };
  }

  /**
   * Run an agent against an item. Always records a run; only act-and-log agents
   * mutate anything, and even they only raise a notification.
   */
  async runAgent(
    ctx: UserContext,
    agentKey: string,
    input: { itemId?: string; payload?: Record<string, unknown> },
  ): Promise<AgentRunRow> {
    const agent = AGENT_CATALOG.find((a) => a.key === agentKey);
    if (!agent) throw new BadRequestException(`unknown agent ${agentKey}`);

    let engagementId: string | null = ctx.engagementId ?? null;
    if (input.itemId) {
      const item = await this.db.oneOrNull<{ engagement_id: string | null }>(
        'SELECT engagement_id FROM item WHERE id = $1 AND org_id = $2',
        [input.itemId, ctx.orgId],
      );
      if (!item) throw new NotFoundException('item not found');
      engagementId = item.engagement_id;
    }

    const proposal = this.propose(agentKey, input.payload ?? {});
    const status =
      agent.autonomy === AgentAutonomy.ActAndLog ? 'applied' : agent.autonomy === AgentAutonomy.BlockAndFlag ? 'blocked' : 'proposed';

    const run = await this.db.one<AgentRunRow>(
      `INSERT INTO agent_run (id, org_id, agent_key, autonomy, engagement_id, item_id, status, input, proposal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        agentKey,
        agent.autonomy,
        engagementId,
        input.itemId ?? null,
        status,
        JSON.stringify(input.payload ?? {}),
        JSON.stringify(proposal),
      ],
    );

    // Act-and-log: the reminder agent raises a notification, nothing more.
    if (agent.autonomy === AgentAutonomy.ActAndLog) {
      await this.db.query(
        `INSERT INTO notification (id, org_id, recipient_id, kind, target_type, target_id, message)
         VALUES ($1,$2,$3,'agent_reminder','item',$4,$5)`,
        [
          randomUUID(),
          ctx.orgId,
          ctx.userId,
          input.itemId ?? run.id,
          String(proposal.message ?? `Reminder from the ${agent.name}`),
        ],
      );
    }

    await this.audit.log(ctx.orgId, ctx.userId, 'agent.ran', 'agent_run', run.id, {
      agentKey,
      autonomy: agent.autonomy,
      status,
    });
    return run;
  }

  async listRuns(ctx: UserContext, itemId?: string): Promise<AgentRunRow[]> {
    const { rows } = await this.db.query<AgentRunRow>(
      `SELECT * FROM agent_run WHERE org_id = $1 ${itemId ? 'AND item_id = $2' : ''}
       ORDER BY created_at DESC LIMIT 200`,
      itemId ? [ctx.orgId, itemId] : [ctx.orgId],
    );
    return rows;
  }

  /** A named person confirms or rejects a proposal. Audited either way. */
  async decide(ctx: UserContext, runId: string, decision: 'confirmed' | 'rejected'): Promise<AgentRunRow> {
    if (decision !== 'confirmed' && decision !== 'rejected') {
      throw new BadRequestException('decision must be confirmed or rejected');
    }
    const run = await this.db.oneOrNull<AgentRunRow>(
      `UPDATE agent_run SET status = $3, decided_by = $4, decided_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'proposed' RETURNING *`,
      [runId, ctx.orgId, decision, ctx.userId],
    );
    if (!run) throw new NotFoundException('no open proposal to decide');
    await this.audit.log(ctx.orgId, ctx.userId, `agent.${decision}`, 'agent_run', runId, {
      agentKey: run.agent_key,
    });
    return run;
  }

  /** Suggestion shape per agent. Kept small and inspectable. */
  private propose(agentKey: string, payload: Record<string, unknown>): Record<string, unknown> {
    switch (agentKey) {
      case 'brief_analysis': {
        const missing = Array.isArray(payload.missingFields) ? (payload.missingFields as string[]) : [];
        const base = typeof payload.baseHours === 'number' ? payload.baseHours : null;
        return {
          summary: missing.length
            ? `Brief is missing ${missing.length} required field(s)`
            : 'Brief appears complete',
          missingFields: missing,
          estimatedHoursRange: base === null ? null : { low: Math.round(base * 0.8), high: Math.round(base * 1.25) },
          note: 'Range is a suggestion for a human to confirm — not a commitment.',
        };
      }
      case 'white_label_guard':
        return { note: 'Findings are raised as compliance_check rows; qa_technical is blocked until cleared.' };
      case 'kpi_reminder':
        return { message: String(payload.message ?? 'Review is overdue') };
      case 'writing_assistant':
        return { draft: String(payload.draft ?? ''), note: 'Draft only — a human sends it.' };
      case 'research':
        return { query: String(payload.query ?? ''), note: 'Queries and results are logged.' };
      case 'asset_sourcing':
        return {
          providers: ['unsplash', 'pexels', 'pixabay'],
          candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
        };
      default:
        return {};
    }
  }
}