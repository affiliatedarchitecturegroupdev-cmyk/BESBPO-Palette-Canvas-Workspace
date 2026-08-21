import { BadRequestException, Injectable } from '@nestjs/common';
import { Database } from '../db/database';
import { IntakeService, BriefRow } from '../intake/intake.service';

export interface TriageInput {
  decision: 'qualified' | 'rejected' | 'needs_info';
  estimateHours?: number;
  capabilityOk: boolean;
  riskFlags?: string[];
  notes?: string;
}

export interface TriageRecord extends TriageInput {
  decidedBy: string;
  decidedAt: string;
}

/** Qualification + estimate per planning document lifecycle stage 2. */
@Injectable()
export class TriageService {
  constructor(
    private readonly db: Database,
    private readonly intake: IntakeService,
  ) {}

  async decide(orgId: string, briefId: string, userId: string, input: TriageInput): Promise<BriefRow> {
    const brief = await this.intake.get(orgId, briefId);
    if (!brief) throw new BadRequestException('brief not found');

    const record: TriageRecord = {
      ...input,
      decidedBy: userId,
      decidedAt: new Date().toISOString(),
    };
    const status =
      input.decision === 'qualified'
        ? 'qualified'
        : input.decision === 'rejected'
          ? 'rejected'
          : 'needs_info';

    return this.db.one<BriefRow>(
      `UPDATE brief SET triage = $3, status = $4, updated_at = now()
       WHERE org_id = $1 AND id = $2 RETURNING *`,
      [orgId, briefId, JSON.stringify(record), status],
    );
  }
}
