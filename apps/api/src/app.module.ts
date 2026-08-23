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
import { WorkstreamsService } from './workstreams/workstream.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { DeliverablesController } from './deliverables/deliverables.controller';
import { DeliverablesService } from './deliverables/deliverables.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { WorkloadController } from './workload/workload.controller';
import { WorkloadService } from './workload/workload.service';
import { ProofingController } from './proofing/proofing.controller';
import { VersionsService } from './proofing/versions.service';
import { ApprovalsService } from './proofing/approvals.service';
import { HandoversService } from './proofing/handovers.service';
import { CapacityController } from './capacity/capacity.controller';
import { CapacityService } from './capacity/capacity.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { IntegrationsController } from './integrations/integrations.controller';
import { IntegrationsService } from './integrations/integrations.service';
import { SsoController } from './sso/sso.controller';
import { SsoService } from './sso/sso.service';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [
    AuditController,
    IdentityController,
    PermissionController,
    DirectoryController,
    TemplatesController,
    IntakeController,
    TriageController,
    ProjectsController,
    TasksController,
    DeliverablesController,
    CommentsController,
    NotificationsController,
    WorkloadController,
    ProofingController,
    CapacityController,
    ReportsController,
    IntegrationsController,
    SsoController,
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
    WorkstreamsService,
    TasksService,
    DeliverablesService,
    CommentsService,
    NotificationsService,
    WorkloadService,
    VersionsService,
    ApprovalsService,
    HandoversService,
    CapacityService,
    ReportsService,
    IntegrationsService,
    SsoService,
  ],
})
export class AppModule {}
