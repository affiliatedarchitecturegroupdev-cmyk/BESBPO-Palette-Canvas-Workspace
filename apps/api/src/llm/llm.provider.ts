export interface LlmCompletionRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  text: string;
  model: string;
  provider: string;
}

/**
 * Provider seam for agent inference (spec §12.3).
 *
 * Abstract class rather than an interface so it doubles as the Nest injection
 * token. The spec requires an open-weight inference API — no self-hosted GPU —
 * and a graceful degradation path: with no provider configured, the platform
 * still works, agents simply return nothing to propose. Implementations are
 * selected from env by {@link createLlmProvider}; nothing else in the codebase
 * knows which vendor is in use.
 */
export abstract class LlmProvider {
  abstract readonly name: string;
  abstract readonly model: string;
  abstract isConfigured(): boolean;
  abstract complete(request: LlmCompletionRequest): Promise<LlmCompletionResult | null>;
}

/** Used when no provider is configured. Always a no-op, never an error. */
export class NullLlmProvider extends LlmProvider {
  readonly name = 'none';
  readonly model = 'none';
  isConfigured() {
    return false;
  }
  async complete(): Promise<LlmCompletionResult | null> {
    return null;
  }
}

/**
 * OpenAI-compatible chat-completions provider. Deliberately generic: an
 * open-weight host (vLLM, Together, Groq, …) that speaks this shape works
 * without a code change.
 */
export class OpenAiCompatibleProvider extends LlmProvider {
  readonly name = 'openai-compatible';
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    readonly model: string,
  ) {
    super();
  }
  isConfigured() {
    return Boolean(this.apiKey && this.baseUrl && this.model);
  }
  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult | null> {
    if (!this.isConfigured()) return null;
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 512,
        messages: [
          ...(request.system ? [{ role: 'system', content: request.system }] : []),
          { role: 'user', content: request.prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;
    return { text, model: this.model, provider: this.name };
  }
}

/**
 * Resolve a provider from environment. Absent configuration is a supported
 * state (NullLlmProvider), which is what keeps agent features opt-in.
 */
export function createLlmProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const key = env.PC_LLM_API_KEY;
  const baseUrl = env.PC_LLM_BASE_URL;
  const model = env.PC_LLM_MODEL;
  if (key && baseUrl && model) {
    return new OpenAiCompatibleProvider(key, baseUrl, model);
  }
  return new NullLlmProvider();
}