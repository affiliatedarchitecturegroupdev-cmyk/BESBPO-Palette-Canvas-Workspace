import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuditService } from './audit.service';
import type { AuditEvent } from '@palette-canvas/shared';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(): AuditEvent[] {
    return this.audit.findAll();
  }

  @Post()
  create(@Body() body: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    // In the real system, high-risk actions must pass through here.
    // This is the foundation endpoint only.
    return this.audit.log(body);
  }
}
