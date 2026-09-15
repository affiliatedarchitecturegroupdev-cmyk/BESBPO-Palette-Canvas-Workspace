export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSendResult {
  delivered: boolean;
  transport: string;
  /** Provider message id when the transport returned one. */
  id?: string;
  /** Why delivery did not happen. Never contains recipient data. */
  reason?: string;
}

/**
 * Provider errors routinely quote the offending mailbox ("550 <a@b> unknown"),
 * and `send_error` is persisted and later surfaced to operators, so scrub any
 * address-looking substring before it leaves the transport. Returning a reason
 * at all is a deliberate trade: knowing "auth failed" versus "greylisted"
 * matters operationally, and the rest of the message carries no personal data.
 */
export function scrubRecipients(text: string): string {
  return text.replace(/[^\s<>()[\]@,;:"]+@[^\s<>()[\]@,;:"]+/g, '<redacted>');
}

/**
 * Provider seam for outbound mail (spec §0.2).
 *
 * Abstract class rather than an interface so it doubles as the Nest injection
 * token, matching LlmProvider. The spec leaves the vendor open, so the
 * repository is built against this seam and the vendor is chosen by env. With
 * nothing configured the platform still runs: mail is persisted to
 * `email_outbox` (which every flow already relies on for its single-use token)
 * and `send` reports it as not delivered rather than throwing.
 *
 * Sending is never allowed to fail a credential flow. A signup that cannot be
 * mailed still creates the organisation and the token row, so the request can
 * be retried once transport is configured — losing the send is recoverable,
 * losing the request is not.
 */
export abstract class EmailTransport {
  abstract readonly name: string;
  abstract isConfigured(): boolean;
  abstract send(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * Default transport. Does not deliver; the caller persists the message to
 * `email_outbox` and this reports `delivered: false` with a reason. Chosen over
 * throwing so that a missing provider degrades to "logged, not sent", which is
 * a supported state for local dev and for CI.
 */
export class OutboxOnlyTransport extends EmailTransport {
  readonly name = 'outbox';
  isConfigured() {
    return false;
  }
  async send(): Promise<EmailSendResult> {
    return { delivered: false, transport: this.name, reason: 'no transport configured' };
  }
}

/**
 * SMTP relay transport. Uses nodemailer when it is installed, resolved lazily
 * so the dependency stays optional — a deployment that picks a transactional
 * API instead is not forced to carry it.
 */
export class SmtpTransport extends EmailTransport {
  readonly name = 'smtp';
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly user: string,
    private readonly password: string,
    private readonly from: string,
  ) {
    super();
  }
  isConfigured() {
    return Boolean(this.host && this.port && this.from);
  }
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { delivered: false, transport: this.name, reason: 'smtp transport incomplete' };
    }
    try {
      const nodemailer = require('nodemailer') as {
        createTransport(options: unknown): {
          sendMail(mail: unknown): Promise<{ messageId?: string }>;
        };
      };
      const transport = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: this.user ? { user: this.user, pass: this.password } : undefined,
      });
      const info = await transport.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
      return { delivered: true, transport: this.name, id: info.messageId };
    } catch (err) {
      return { delivered: false, transport: this.name, reason: scrubRecipients((err as Error).message) };
    }
  }
}

/**
 * Resolve a transport from environment. `PC_SMTP_HOST`/`PC_SMTP_FROM` select
 * SMTP; anything else falls back to OutboxOnlyTransport. The vendor decision
 * (§0.2) therefore changes configuration, not code.
 */
export function createEmailTransport(env: NodeJS.ProcessEnv = process.env): EmailTransport {
  const host = env.PC_SMTP_HOST;
  const from = env.PC_SMTP_FROM;
  if (host && from) {
    return new SmtpTransport(
      host,
      Number(env.PC_SMTP_PORT ?? 587),
      env.PC_SMTP_USER ?? '',
      env.PC_SMTP_PASSWORD ?? '',
      from,
    );
  }
  return new OutboxOnlyTransport();
}
