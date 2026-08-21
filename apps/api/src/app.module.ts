import { Module } from '@nestjs/common';
import { Database } from './db/database';
import { IdentityService } from './identity/identity.service';
import { IdentityController } from './identity/identity.controller';
import { AuthzService } from './identity/authz.service';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { PermissionController } from './permissions/permission.controller';
import { PermissionService } from './permissions/permission.service';
import { DirectoryController } from './directory/directory.controller';
import { DirectoryService } from './directory/directory.service';
import { TemplatesController } from './templates/templates.controller';
import { TemplatesService } from './templates/templates.service';
import { IntakeController } from './intake/intake.controller';
import { IntakeService } from './intake/intake.service';
import { TriageController } from './triage/triage.controller';
import { TriageService } from './triage/triage.service';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';

@Module({
  controllers: [
    AuditController,
    IdentityController,
    PermissionController,
    DirectoryController,
    TemplatesController,
    IntakeController,
    TriageController,
    ProjectsController,
  ],
  providers: [
    Database,
    IdentityService,
    AuthzService,
    AuditService,
    PermissionService,
    DirectoryService,
    TemplatesService,
    IntakeService,
    TriageService,
    ProjectsService,
  ],
})
export class AppModule {}
