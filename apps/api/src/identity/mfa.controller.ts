import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { IdentityService } from './identity.service';
import { generateSecret, totpVerify } from './totp';

/** P7-01 TOTP MFA: self-service enrol/activate/verify per person. */
@Controller('identity/mfa')
export class MfaController {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly identity: IdentityService,
  ) {}

  @Get('status')
  async status(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    const row = await this.db.oneOrNull<{ mfa_enabled: boolean }>(
      'SELECT mfa_enabled FROM person WHERE id = $1',
      [ctx.userId],
    );
    return { enabled: row?.mfa_enabled ?? false };
  }

  @Post('enroll')
  async enroll(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    const secret = generateSecret();
    await this.db.query('UPDATE person SET mfa_secret = $1, mfa_enabled = false WHERE id = $2', [secret, ctx.userId]);
    return {
      secret,
      otpauthUrl: `otpauth://totp/PaletteCanvas:${encodeURIComponent(email ?? '')}?secret=${secret}&issuer=PaletteCanvas`,
    };
  }

  @Post('activate')
  async activate(@Headers('x-user-email') email: string | undefined, @Body() body: { code: string }) {
    const ctx = await this.identity.resolve(email);
    await this.requireValidCode(ctx.userId, body.code);
    await this.db.query('UPDATE person SET mfa_enabled = true WHERE id = $1', [ctx.userId]);
    await this.audit.log(ctx.orgId, ctx.userId, 'mfa.activated', 'person', ctx.userId, {});
    return { enabled: true };
  }

  @Post('verify')
  async verify(@Headers('x-user-email') email: string | undefined, @Body() body: { code: string }) {
    const ctx = await this.identity.resolve(email);
    await this.requireValidCode(ctx.userId, body.code);
    return { valid: true };
  }

  private async requireValidCode(personId: string, code: string | undefined) {
    const row = await this.db.oneOrNull<{ mfa_secret: string | null }>(
      'SELECT mfa_secret FROM person WHERE id = $1',
      [personId],
    );
    if (!row?.mfa_secret || !code || !totpVerify(row.mfa_secret, code)) {
      throw new UnauthorizedException('invalid TOTP code');
    }
  }
}
