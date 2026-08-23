import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { JobsService, JobRow } from './jobs.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(
    @Headers('x-user-email') email: string | undefined,
    @Query('queue') queue?: string,
    @Query('status') status?: string,
  ): Promise<JobRow[]> {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.JobsRead);
    return this.jobs.list(ctx.orgId, queue, status);
  }

  @Get('dlq')
  async dlq(@Headers('x-user-email') email: string | undefined): Promise<JobRow[]> {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.JobsRead);
    return this.jobs.dlq(ctx.orgId);
  }

  @Post(':id/retry')
  async retry(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.JobsManage);
    return this.jobs.retry(ctx.orgId, id);
  }

  /** Manual enqueue (ops tooling); idempotency key dedupes retries. */
  @Post()
  async enqueue(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { queue: string; payload?: Record<string, unknown>; idempotencyKey?: string; maxAttempts?: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.JobsManage);
    return this.jobs.enqueue(ctx.orgId, body.queue, body.payload ?? {}, {
      idempotencyKey: body.idempotencyKey,
      maxAttempts: body.maxAttempts,
    });
  }

  /** Drain due jobs synchronously — used by tests and ops runbooks. */
  @Post('process')
  async process(@Headers('x-user-email') email: string | undefined, @Body() body: { queues?: string[] }) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.JobsManage);
    return { processed: await this.jobs.workOnce() };
  }
}
