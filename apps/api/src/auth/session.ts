import { createHash, randomBytes } from 'crypto';

export const SESSION_COOKIE = 'pc_session';
const HOUR = 3_600_000;
export const SESSION_TTL_LONG = 30 * 24 * HOUR; // remember-me
export const SESSION_TTL_SHORT = 8 * HOUR; // default

/**
 * Lifetime for single-use credential tokens (email verification, password
 * reset). Before N1.1 these had no expiry and stayed valid until consumed, so
 * a leaked link was live indefinitely. 24h is long enough for a signup
 * verification that lands in a spam folder, short enough that a forwarded
 * mailbox does not become a standing credential.
 */
export const CREDENTIAL_TOKEN_TTL_MS = 24 * HOUR;

/**
 * Resend throttle window per outbox `kind` + recipient. Re-issuing a token
 * inside this window returns the existing pending token rather than minting a
 * new one, so the endpoint cannot be used to flood a third party's mailbox or
 * to invalidate a link the user is about to click.
 */
export const RESEND_THROTTLE_MS = 60_000;

const MIN_PASSWORD_LENGTH = 8;

/**
 * Credential policy shared by signup, reset and change. Length only: the spec
 * asks for a minimum, and composition rules push users toward predictable
 * substitutions that are weaker than a longer passphrase.
 */
export function passwordMeetsPolicy(password: unknown): password is string {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

/** 32-byte URL-safe session token (opaque bearer). */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 for at-rest token storage — the raw token is never persisted. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Minimal cookie-header parser (no external cookie-parser dependency). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/** Set-Cookie value for the httpOnly session cookie (A-01 §0.1). */
export function sessionCookieValue(token: string, ttlMs: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.trunc(ttlMs / 1000)}${secure}`;
}

export function expireSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}