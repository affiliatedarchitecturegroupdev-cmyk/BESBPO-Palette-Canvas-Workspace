import { AsyncLocalStorage } from 'async_hooks';

/**
 * B-03 agent attribution. The `x-agent-tag` request header is captured into a
 * request-scoped context so any audit row written during the request includes
 * which agent (or automation) drove it. Without the header the tag is null.
 */
export const agentContext = new AsyncLocalStorage<{ tag: string | null }>();

export function currentAgentTag(): string | null {
  return agentContext.getStore()?.tag ?? null;
}
