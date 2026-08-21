import { Controller, Get, Headers } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { Database } from '../db/database';

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly db: Database,
  ) {}

  @Get('me')
  async me(@Headers('x-user-email') email: string | undefined) {
    return this.identity.resolve(email);
  }

  /** Dev user switcher — will be removed once real SSO lands (Phase 5). */
  @Get('users')
  async users() {
    const { rows } = await this.db.query<{ id: string; email: string; name: string }>(
      'SELECT id, email, name FROM person ORDER BY name',
    );
    return rows;
  }
}
