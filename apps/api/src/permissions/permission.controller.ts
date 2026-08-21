import { Body, Controller, Post } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { UserContext, VisibilityLevel } from '@palette-canvas/shared';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissions: PermissionService) {}

  @Post('check')
  check(@Body() body: { context: UserContext; visibility: VisibilityLevel }) {
    return {
      allowed: this.permissions.canSee(body.context, body.visibility),
    };
  }

  @Post('assess')
  assess(@Body() body: { context: UserContext }) {
    return this.permissions.assess(body.context);
  }
}
