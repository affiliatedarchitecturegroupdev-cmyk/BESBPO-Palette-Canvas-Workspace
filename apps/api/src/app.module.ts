import { Module } from '@nestjs/common';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { PermissionController } from './permissions/permission.controller';
import { PermissionService } from './permissions/permission.service';

@Module({
  controllers: [AuditController, PermissionController],
  providers: [AuditService, PermissionService],
})
export class AppModule {}
