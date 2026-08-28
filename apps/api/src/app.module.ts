import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Database } from './db/database';
import { IdentityService } from './identity/identity.service';
import { IdentityController } from './identity/identity.controller';
import { ApiKeysService } from './identity/api-keys.service';
import { ApiKeysController } from './identity/api-keys.controller';
import { ApiKeyMiddleware } from './identity/api-key.middleware';
import { MfaController } from './identity/mfa.controller';
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
import { EventsService } from './events/events.service';
import { EventsController } from './events/events.controller';
import { JobsService } from './jobs/jobs.service';
import { JobsController } from './jobs/jobs.controller';
import { StorageService } from './storage/storage.service';
import { StorageController } from './storage/storage.controller';
import { MediaService } from './media/media.service';
import { CommercialService } from './commercial/commercial.service';
import { CommercialController } from './commercial/commercial.controller';
import { AutomationsService } from './automations/automations.service';
import { AutomationsController } from './automations/automations.controller';
import { AiService } from './ai/ai.service';
import { AiController } from './ai/ai.controller';
import { LegalService } from './legal/legal.service';
import { LegalController } from './legal/legal.controller';
import { PermissionsReviewsService } from './permissions/reviews.service';
import { PermissionsReviewsController } from './permissions/reviews.controller';
import { EsignController } from './proofing/esign.controller';

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
    EventsController,
    JobsController,
    StorageController,
    CommercialController,
    AutomationsController,
    AiController,
    LegalController,
    PermissionsReviewsController,
    ApiKeysController,
    MfaController,
    EsignController,
  ],
  providers: [
    Database,
    IdentityService,
    ApiKeysService,
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
    EventsService,
    JobsService,
    StorageService,
    MediaService,
    CommercialService,
    AutomationsService,
    AiService,
    LegalService,
    PermissionsReviewsService,
  ],
})
export class AppModule implements NestModule {
  /** x-api-key → session mapping + x-agent-tag capture (P7-04, B-03). */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('*');
  }
}
