import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, LoginInput, SignupInput } from './auth.service';
import {
  SESSION_COOKIE,
  expireSessionCookie,
  parseCookies,
  sessionCookieValue,
} from './session';

interface HttpReply {
  setHeader(name: string, value: string): void;
}

/** Validates a signup or login payload. Returns the error or null. */
function validateCredentials(email: unknown, password: unknown): string | null {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'invalid email';
  }
  if (typeof password !== 'string' || password.length < 8) {
    return 'password must be at least 8 characters';
  }
  return null;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: Partial<SignupInput> & { confirmPassword?: string },
  ) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('passwords do not match');
    }
    const err = validateCredentials(body.ownerEmail, body.password);
    if (err) throw new BadRequestException(err);
    if (!body.slug || !body.orgName || !body.ownerName) {
      throw new BadRequestException('slug, orgName and ownerName are required');
    }
    const result = await this.auth.signup({
      slug: body.slug,
      orgName: body.orgName,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail!,
      password: body.password!,
    });
    return { org: result.org, person: { id: result.person.id, email: result.person.email } };
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: { token: string }) {
    if (!body.token) throw new BadRequestException('token required');
    const { orgId, personId } = await this.auth.verifyEmail(body.token);
    return { verified: true, orgId, personId };
  }

  /**
   * Re-send a verification link (A-02). Responds 200 with `sent: false` for an
   * unknown or already-verified address so the endpoint does not disclose which
   * accounts exist; `throttled: true` tells a legitimate client to wait.
   */
  @Post('verify/resend')
  @HttpCode(200)
  async resendVerification(@Body() body: { email: string }) {
    if (!body.email) throw new BadRequestException('email required');
    return this.auth.resendVerification(body.email);
  }

  /** Start a password reset (A-03). Always 200, for the same reason. */
  @Post('password/reset/request')
  @HttpCode(200)
  async requestReset(@Body() body: { email: string }) {
    if (!body.email) throw new BadRequestException('email required');
    await this.auth.requestPasswordReset(body.email);
    return { ok: true, message: 'if that address exists, a reset link has been sent' };
  }

  @Post('password/reset')
  @HttpCode(200)
  async resetPassword(@Body() body: { token: string; password: string; confirmPassword?: string }) {
    if (!body.token) throw new BadRequestException('token required');
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('passwords do not match');
    }
    const { personId } = await this.auth.resetPassword(body.token, body.password ?? '');
    return { ok: true, personId };
  }

  /** Change a password from a live session (A-03). */
  @Post('password/change')
  @HttpCode(200)
  async changePassword(
    @Body() body: { currentPassword: string; password: string; confirmPassword?: string },
    @Headers('cookie') cookie: string | undefined,
  ) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('passwords do not match');
    }
    const token = parseCookies(cookie)[SESSION_COOKIE];
    const result = await this.auth.changePassword(
      token,
      body.currentPassword ?? '',
      body.password ?? '',
    );
    return { ok: true, ...result };
  }

  /** Revoke all other sessions for the current person (A-03). */
  @Post('sessions/revoke')
  @HttpCode(200)
  async revokeSessions(@Headers('cookie') cookie: string | undefined) {
    const token = parseCookies(cookie)[SESSION_COOKIE];
    const resolved = await this.auth.resolveSession(token);
    if (!resolved) throw new UnauthorizedException('not authenticated');
    const revoked = await this.auth.revokeSessions(resolved.person.id, token);
    return { ok: true, revoked };
  }

  @Post('login')
  async login(@Body() body: Partial<LoginInput>, @Res({ passthrough: true }) res: HttpReply) {
    const err = validateCredentials(body.email, body.password);
    if (err) throw new BadRequestException(err);
    const session = await this.auth.login({
      email: body.email!,
      password: body.password!,
      remember: body.remember,
    });
    res.setHeader('Set-Cookie', sessionCookieValue(session.token, session.ttlMs));
    return { ok: true, expiresInMs: session.ttlMs };
  }

  @Post('logout')
  async logout(@Headers('cookie') cookie: string | undefined, @Res({ passthrough: true }) res: HttpReply) {
    const token = parseCookies(cookie)[SESSION_COOKIE];
    await this.auth.logout(token);
    res.setHeader('Set-Cookie', expireSessionCookie());
    return { ok: true };
  }

  @Get('session')
  async session(@Headers('cookie') cookie: string | undefined) {
    const token = parseCookies(cookie)[SESSION_COOKIE];
    const resolved = await this.auth.resolveSession(token);
    if (!resolved) return { authenticated: false };
    return {
      authenticated: true,
      person: { id: resolved.person.id, email: resolved.person.email, name: resolved.person.name },
      org: { id: resolved.org.id, slug: resolved.org.slug, name: resolved.org.display_name ?? resolved.org.name },
      roles: resolved.roles,
    };
  }
}