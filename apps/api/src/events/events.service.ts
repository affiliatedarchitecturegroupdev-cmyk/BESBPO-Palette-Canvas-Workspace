import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface DomainEvent {
  orgId: string;
  event: string;
  payload: Record<string, unknown>;
  at: string;
}

export type EventListener = (e: DomainEvent) => void;

/**
 * In-process domain event bus. Publishers are domain modules (approvals,
 * tasks, versions, notifications); subscribers are the automation engine
 * (P6-08) and the SSE stream (P6-09). Single-process by design — a
 * multi-instance deployment swaps this for a broker behind the same API.
 */
@Injectable()
export class EventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  publish(orgId: string, event: string, payload: Record<string, unknown>): void {
    const e: DomainEvent = { orgId, event, payload, at: new Date().toISOString() };
    this.emitter.emit('domain', e);
  }

  /** Returns an unsubscribe function. */
  subscribe(listener: EventListener): () => void {
    this.emitter.on('domain', listener);
    return () => this.emitter.off('domain', listener);
  }
}
