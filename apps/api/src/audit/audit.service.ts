import { Injectable } from '@nestjs/common';
import type { AuditEvent } from '@palette-canvas/shared';

/**
 * In-memory audit event log — foundation for the audit trail required
 * by the planning document. Replace with Postgres-backed storage in Phase 2.
 */
@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const record: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };
    this.events.push(record);
    return record;
  }

  findAll(): AuditEvent[] {
    return [...this.events];
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
