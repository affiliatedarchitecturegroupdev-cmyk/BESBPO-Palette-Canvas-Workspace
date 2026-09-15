import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ComplianceCheckType, UserContext } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ComplianceFinding {
  kind: ComplianceCheckType;
  detail: string;
  /** Where the finding was seen — a locator, never a file body. */
  locator: string;
}

export interface ComplianceCheckRow {
  id: string;
  org_id: string;
  item_id: string;
  engagement_id: string | null;
  check_type: string;
  status: string;
  findings: ComplianceFinding[];
  cleared_by: string | null;
  cleared_at: string | null;
}

/** Minimal file shape the guard needs — avoids coupling to the files module. */
export interface ComplianceFile {
  name: string;
  metadata?: Record<string, unknown>;
}

/**
 * White-Label Compliance Guard (spec §12.5).
 *
 * Three deterministic scans over an item's attached files: metadata, filename
 * and attribution. This is the one agent permitted to *block* — and it can
 * never clear its own block. Only a named human clears a finding, with a
 * reason, and that clearance is audited. The scans are deliberately simple and
 * explainable; an LLM-assisted pass, if ever enabled, is a separate opt-in seam.
 */
@Injectable()
export class ComplianceService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  /** Run all three scans against an item's files and record the results. */
  async runGuard(ctx: UserContext, itemId: string, files: ComplianceFile[]): Promise<ComplianceCheckRow[]> {
    const item = await this.db.oneOrNull<{ id: string; engagement_id: string | null }>(
      'SELECT id, engagement_id FROM item WHERE id = $1 AND org_id = $2',
      [itemId, ctx.orgId],
    );
    if (!item) throw new NotFoundException('item not found');

    const results: ComplianceCheckRow[] = [];
    for (const checkType of Object.values(ComplianceCheckType)) {
      const findings = this.scan(checkType, files);
      results.push(
        await this.db.one<ComplianceCheckRow>(
          `INSERT INTO compliance_check (id, org_id, item_id, engagement_id, check_type, status, findings, checked_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now()) RETURNING *`,
          [
            randomUUID(),
            ctx.orgId,
            itemId,
            item.engagement_id,
            checkType,
            findings.length ? 'failed' : 'passed',
            JSON.stringify(findings),
          ],
        ),
      );
    }

    await this.audit.log(ctx.orgId, ctx.userId, 'compliance.guard_run', 'item', itemId, {
      failed: results.filter((r) => r.status === 'failed').length,
    });
    return results;
  }

  async listChecks(ctx: UserContext, itemId: string): Promise<ComplianceCheckRow[]> {
    const { rows } = await this.db.query<ComplianceCheckRow>(
      'SELECT * FROM compliance_check WHERE item_id = $1 AND org_id = $2 ORDER BY created_at DESC',
      [itemId, ctx.orgId],
    );
    return rows;
  }

  /** A named human clears a finding, with a reason. Audited. */
  async clearCheck(ctx: UserContext, checkId: string, reason: string): Promise<ComplianceCheckRow> {
    if (!reason || reason.trim().length < 4) {
      throw new BadRequestException('clearing a compliance finding requires a reason');
    }
    const row = await this.db.oneOrNull<ComplianceCheckRow>(
      `UPDATE compliance_check SET status = 'cleared', cleared_by = $3, cleared_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'failed' RETURNING *`,
      [checkId, ctx.orgId, ctx.userId],
    );
    if (!row) throw new NotFoundException('no open failed check to clear');
    await this.audit.log(ctx.orgId, ctx.userId, 'compliance.cleared', 'compliance_check', checkId, { reason });
    return row;
  }

  /** True when the item has no open failed check — the QA-gate precondition. */
  async isClear(itemId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM compliance_check WHERE item_id = $1 AND status = 'failed'`,
      [itemId],
    );
    return Number(rows[0].n) === 0;
  }

  /** Deterministic scans. Simple on purpose: explainable beats clever here. */
  private scan(checkType: ComplianceCheckType, files: ComplianceFile[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];
    for (const f of files) {
      if (checkType === ComplianceCheckType.MetadataScan) {
        const leaked = f.metadata?.author ?? f.metadata?.company ?? f.metadata?.creator;
        if (typeof leaked === 'string' && leaked.trim().length > 0) {
          findings.push({
            kind: checkType,
            detail: `metadata carries author/company "${leaked}"`,
            locator: f.name,
          });
        }
      }
      if (checkType === ComplianceCheckType.FilenameScan) {
        if (/\b(draft|internal|confidential|wip|final-v\d+)\b/i.test(f.name)) {
          findings.push({
            kind: checkType,
            detail: 'filename exposes an internal working marker',
            locator: f.name,
          });
        }
      }
      if (checkType === ComplianceCheckType.AttributionScan) {
        const attributed =
          typeof f.metadata?.attribution === 'string' || typeof f.metadata?.license === 'string';
        if (!attributed) {
          findings.push({
            kind: checkType,
            detail: 'no attribution or licence recorded for the asset',
            locator: f.name,
          });
        }
      }
    }
    return findings;
  }
}