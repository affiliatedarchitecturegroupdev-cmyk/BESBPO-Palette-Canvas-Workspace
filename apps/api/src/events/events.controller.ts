import { Controller, Headers, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Capability } from '@palette-canvas/shared';
import { EventsService } from './events.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

/**
 * P6-09 live updates: authenticated SSE channel. Clients receive domain
 * events for their org; notification events are additionally filtered to the
 * recipient. Dev auth accepts the standard x-user-email header or an `email`
 * query param (browser EventSource cannot set headers).
 */
@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Sse('stream')
  async stream(
    @Headers('x-user-email') headerEmail: string | undefined,
    @Query('email') queryEmail: string | undefined,
  ): Promise<Observable<MessageEvent>> {
    const ctx = await this.identity.resolve(headerEmail ?? queryEmail);
    this.authz.require(ctx, Capability.EventsStream);
    return new Observable<MessageEvent>((subscriber) => {
      const unsubscribe = this.events.subscribe((e) => {
        if (e.orgId !== ctx.orgId) return;
        const recipient = e.payload.recipient_id as string | undefined;
        if (e.event === 'notification.created' && recipient && recipient !== ctx.userId) return;
        subscriber.next({ data: { event: e.event, payload: e.payload, at: e.at } } as MessageEvent);
      });
      const heartbeat = setInterval(() => subscriber.next({ data: { event: 'ping' } } as MessageEvent), 25000);
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    });
  }
}
