import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface RateCardEntryInput {
  role: string;
  skill?: string;
  hourlyRate: number;
}

export interface EstimateLineInput {
  label: string;
  role: string;
  hours: number;
  hourlyRate: number;
}

/**
 * P6-07 commercial controls: rate cards, versioned estimates, budget vs
 * effort, PO fields, and invoice-ready milestones. Money flows through
 * NUMERIC columns; computation happens in SQL where practical.
 */
@Injectable()
export class CommercialService {
  constructor(private readonly db: Database) {}

  /* ---- rate cards ---- */

  async listRateCards(orgId: string) {
    const { rows } = await this.db.query(
      `SELECT rc.id, rc.name, rc.currency, rc.active, rc.created_at,
              COALESCE(json_agg(json_build_object('role', e.role, 'skill', e.skill, 'hourly_rate', e.hourly_rate))
                       FILTER (WHERE e.id IS NOT NULL), '[]') AS entries
       FROM rate_card rc
       LEFT JOIN rate_card_entry e ON e.rate_card_id = rc.id
       WHERE rc.org_id = $1
       GROUP BY rc.id ORDER BY rc.created_at`,
      [orgId],
    );
    return rows;
  }

  async createRateCard(orgId: string, actorId: string, name: string, currency: string, entries: RateCardEntryInput[]) {
    const card = await this.db.one(
      `INSERT INTO rate_card (id, org_id, name, currency, created_by) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, currency, active`,
      [randomUUID(), orgId, name, currency || 'USD', actorId] as never[],
    );
    for (const e of entries) {
      await this.db.query(
        `INSERT INTO rate_card_entry (id, org_id, rate_card_id, role, skill, hourly_rate) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), orgId, (card as { id: string }).id, e.role, e.skill ?? null, e.hourlyRate],
      );
    }
    return card;
  }

  /* ---- estimates ---- */

  async listEstimates(orgId: string, projectId: string) {
    const { rows } = await this.db.query(
      `SELECT e.id, e.version, e.status, e.total_hours, e.total_amount, e.notes, e.created_at,
              COALESCE(json_agg(json_build_object('label', l.label, 'role', l.role, 'hours', l.hours,
                                                  'hourly_rate', l.hourly_rate, 'amount', l.amount))
                       FILTER (WHERE l.id IS NOT NULL), '[]') AS lines
       FROM estimate e
       LEFT JOIN estimate_line l ON l.estimate_id = e.id
       WHERE e.org_id = $1 AND e.project_id = $2
       GROUP BY e.id ORDER BY e.version DESC`,
      [orgId, projectId],
    );
    return rows;
  }

  /** Create the next estimate version for a project (draft). */
  async createEstimate(orgId: string, projectId: string, actorId: string, notes: string, lines: EstimateLineInput[]) {
    const next = await this.db.one<{ next: number }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM estimate WHERE project_id = $1',
      [projectId],
    );
    const totalHours = lines.reduce((s, l) => s + l.hours, 0);
    const totalAmount = lines.reduce((s, l) => s + l.hours * l.hourlyRate, 0);
    const est = await this.db.one(
      `INSERT INTO estimate (id, org_id, project_id, version, notes, total_hours, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, version, status, total_hours, total_amount`,
      [randomUUID(), orgId, projectId, next.next, notes ?? '', totalHours, totalAmount, actorId] as never[],
    );
    for (const l of lines) {
      await this.db.query(
        `INSERT INTO estimate_line (id, org_id, estimate_id, label, role, hours, hourly_rate, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [randomUUID(), orgId, (est as { id: string }).id, l.label, l.role, l.hours, l.hourlyRate, l.hours * l.hourlyRate],
      );
    }
    return est;
  }

  async setEstimateStatus(orgId: string, id: string, status: 'submitted' | 'approved') {
    return this.db.oneOrNull(
      `UPDATE estimate SET status = $3 WHERE id = $1 AND org_id = $2
       RETURNING id, version, status, total_hours, total_amount`,
      [id, orgId, status] as never[],
    );
  }

  /* ---- budget vs effort ---- */

  /** Approved estimate vs logged effort valued at the org's blended rate. */
  async budgetVsEffort(orgId: string, projectId: string) {
    const project = await this.db.oneOrNull<{ name: string; po_number: string | null; budget_amount: string | null }>(
      'SELECT name, po_number, budget_amount FROM project WHERE id = $1 AND org_id = $2',
      [projectId, orgId],
    );
    if (!project) return null;
    const approved = await this.db.oneOrNull<{ total_hours: string; total_amount: string }>(
      `SELECT total_hours, total_amount FROM estimate
       WHERE org_id = $1 AND project_id = $2 AND status = 'approved'
       ORDER BY version DESC LIMIT 1`,
      [orgId, projectId],
    );
    const effort = await this.db.one<{ hours: string }>(
      `SELECT COALESCE(SUM(te.hours), 0) AS hours
       FROM time_entry te JOIN task t ON t.id = te.task_id
       WHERE t.org_id = $1 AND t.project_id = $2`,
      [orgId, projectId],
    );
    const blended = await this.db.oneOrNull<{ rate: string }>(
      `SELECT AVG(hourly_rate) AS rate FROM rate_card_entry e
       JOIN rate_card rc ON rc.id = e.rate_card_id
       WHERE e.org_id = $1 AND rc.active = true`,
      [orgId],
    );
    const loggedHours = Number(effort.hours);
    const blendedRate = Number(blended?.rate ?? 0);
    return {
      project_id: projectId,
      name: project.name,
      po_number: project.po_number,
      budget_amount: project.budget_amount === null ? null : Number(project.budget_amount),
      approved_hours: approved ? Number(approved.total_hours) : 0,
      approved_amount: approved ? Number(approved.total_amount) : 0,
      logged_hours: loggedHours,
      logged_value: loggedHours * blendedRate,
      blended_rate: blendedRate,
    };
  }

  /* ---- PO + invoice-ready milestones ---- */

  async setCommercialFields(orgId: string, projectId: string, poNumber: string | null, budgetAmount: number | null) {
    return this.db.oneOrNull(
      `UPDATE project SET po_number = $3, budget_amount = $4, updated_at = now()
       WHERE id = $1 AND org_id = $2
       RETURNING id, name, po_number, budget_amount`,
      [projectId, orgId, poNumber, budgetAmount] as never[],
    );
  }

  async setInvoiceReady(orgId: string, milestoneId: string, ready: boolean, amount: number | null) {
    return this.db.oneOrNull(
      `UPDATE milestone SET invoice_ready = $3, invoice_amount = $4
       WHERE id = $1 AND project_id IN (SELECT id FROM project WHERE org_id = $2)
       RETURNING id, name, status, invoice_ready, invoice_amount`,
      [milestoneId, orgId, ready, amount] as never[],
    );
  }

  async invoiceReady(orgId: string) {
    const { rows } = await this.db.query(
      `SELECT m.id, m.name, m.status, m.invoice_amount, m.target_date, p.id AS project_id, p.name AS project_name, p.po_number
       FROM milestone m JOIN project p ON p.id = m.project_id
       WHERE p.org_id = $1 AND m.invoice_ready = true
       ORDER BY m.target_date NULLS LAST, p.name`,
      [orgId],
    );
    return rows;
  }
}
