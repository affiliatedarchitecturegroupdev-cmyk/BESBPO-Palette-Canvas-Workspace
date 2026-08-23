/**
 * Shared domain types aligned with the Palette Canvas planning document.
 * Work hierarchy: Organisation → Agency/Client Account → Brand → Workspace →
 * Project/Service Order → Workstream → Deliverable → Task → Proof/Asset/Decision.
 */

export type OrgId = string;
export type UserId = string;
export type WorkspaceId = string;
export type ProjectId = string;
export type TaskId = string;
export type AssetId = string;

/** Four workspace visibility levels per the planning document. */
export enum VisibilityLevel {
  Internal = 'internal',
  AgencyShared = 'agency_shared',
  ClientShared = 'client_shared',
  RestrictedThirdParty = 'restricted_third_party',
}

/** Primary stakeholder roles (PDF section 1). */
export enum Role {
  PlatformOwner = 'platform_owner',
  OperationsDirector = 'operations_director',
  AccountManager = 'account_manager',
  ProductionLead = 'production_lead',
  CreativeContributor = 'creative_contributor',
  QualityReviewer = 'quality_reviewer',
  AgencyAdmin = 'agency_admin',
  AgencyContributor = 'agency_contributor',
  ClientApprover = 'client_approver',
  ThirdPartyVendor = 'third_party_vendor',
  FinanceUser = 'finance_user',
}

export interface UserContext {
  userId: UserId;
  orgId: OrgId;
  roles: Role[];
  /** Workspace/project scopes this user may see; used with visibility levels. */
  scopes: Array<{ workspaceId: WorkspaceId; visibility: VisibilityLevel }>;
}

/** Whether `actor` may see a record at `recordVisibility`. */
export function canSeeVisibility(
  actor: UserContext,
  recordVisibility: VisibilityLevel,
): boolean {
  // Platform owner and operations director can read everything
  if (
    actor.roles.includes(Role.PlatformOwner) ||
    actor.roles.includes(Role.OperationsDirector)
  ) {
    return true;
  }
  // Internal records are only visible to internal-capable roles
  if (recordVisibility === VisibilityLevel.Internal) {
    return (
      actor.roles.includes(Role.AccountManager) ||
      actor.roles.includes(Role.ProductionLead) ||
      actor.roles.includes(Role.QualityReviewer) ||
      actor.roles.includes(Role.CreativeContributor) ||
      actor.roles.includes(Role.FinanceUser)
    );
  }
  // Agency-shared: agency roles + internal roles
  if (recordVisibility === VisibilityLevel.AgencyShared) {
    return !actor.roles.every(
      (r) =>
        r === Role.ClientApprover || r === Role.ThirdPartyVendor,
    );
  }
  // Client-shared: everyone with at least one scope in that workspace
  if (recordVisibility === VisibilityLevel.ClientShared) {
    return actor.scopes.some((s) => s.visibility === recordVisibility);
  }
  // Restricted third-party: only internal-capable roles with explicit scope
  return actor.scopes.some((s) => s.visibility === VisibilityLevel.RestrictedThirdParty);
}

/** Audit event, logged for any high-risk action (per PDF governance). */
export interface AuditEvent {
  id: string;
  actor: UserId;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Phase 2: capability-based policy + tenancy scoping                  */
/* ------------------------------------------------------------------ */

/** Action-level capabilities the policy layer checks. */
export enum Capability {
  DirectoryRead = 'directory.read',
  DirectoryManage = 'directory.manage',
  IntakeCreate = 'intake.create',
  IntakeTriage = 'intake.triage',
  IntakeConvert = 'intake.convert',
  ProjectsRead = 'projects.read',
  ProjectsManage = 'projects.manage',
  TemplatesRead = 'templates.read',
  TemplatesManage = 'templates.manage',
  AuditRead = 'audit.read',
  IdentityGrant = 'identity.grant',
  TasksRead = 'tasks.read',
  TasksWrite = 'tasks.write',
  DeliverablesRead = 'deliverables.read',
  DeliverablesWrite = 'deliverables.write',
  CommentsWrite = 'comments.write',
  CommentsResolve = 'comments.resolve',
  NotificationsRead = 'notifications.read',
  WorkloadRead = 'workload.read',
  TimeLog = 'time.log',
  /* Phase 4: proofing, approvals, handover */
  VersionsWrite = 'versions.write',
  ApprovalsRequest = 'approvals.request',
  ApprovalsDecide = 'approvals.decide',
  QaWrite = 'qa.write',
  ChangeWrite = 'change.write',
  HandoverWrite = 'handover.write',
  /* Phase 6 V1 */
  CapacityRead = 'capacity.read',
  CapacityWrite = 'capacity.write',
  ReportsRead = 'reports.read',
  IntegrationsRead = 'integrations.read',
  IntegrationsWrite = 'integrations.write',
  AnnotationsWrite = 'annotations.write',
  IdentitySsoRead = 'identity.sso.read',
  IdentitySsoManage = 'identity.sso.manage',
}

/** Which roles hold which capabilities (PDF section 1 role table). */
export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  [Role.PlatformOwner]: Object.values(Capability),
  [Role.OperationsDirector]: [
    Capability.DirectoryRead,
    Capability.IntakeCreate,
    Capability.IntakeTriage,
    Capability.IntakeConvert,
    Capability.ProjectsRead,
    Capability.ProjectsManage,
    Capability.TemplatesRead,
    Capability.TemplatesManage,
    Capability.AuditRead,
    Capability.IdentityGrant,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.DeliverablesRead,
    Capability.DeliverablesWrite,
    Capability.CommentsWrite,
    Capability.CommentsResolve,
    Capability.NotificationsRead,
    Capability.WorkloadRead,
    Capability.TimeLog,
    Capability.VersionsWrite,
    Capability.ApprovalsRequest,
    Capability.QaWrite,
    Capability.ChangeWrite,
    Capability.HandoverWrite,
    Capability.CapacityRead,
    Capability.CapacityWrite,
    Capability.ReportsRead,
    Capability.IntegrationsRead,
    Capability.IntegrationsWrite,
    Capability.AnnotationsWrite,
    Capability.IdentitySsoRead,
    Capability.IdentitySsoManage,
  ],
  [Role.AccountManager]: [
    Capability.DirectoryRead,
    Capability.DirectoryManage,
    Capability.IntakeCreate,
    Capability.IntakeTriage,
    Capability.IntakeConvert,
    Capability.ProjectsRead,
    Capability.ProjectsManage,
    Capability.TemplatesRead,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.DeliverablesRead,
    Capability.DeliverablesWrite,
    Capability.CommentsWrite,
    Capability.CommentsResolve,
    Capability.NotificationsRead,
    Capability.WorkloadRead,
    Capability.ApprovalsRequest,
    Capability.ChangeWrite,
    Capability.CapacityRead,
    Capability.ReportsRead,
    Capability.IntegrationsRead,
    Capability.AnnotationsWrite,
  ],
  [Role.ProductionLead]: [
    Capability.DirectoryRead,
    Capability.IntakeTriage,
    Capability.ProjectsRead,
    Capability.ProjectsManage,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.DeliverablesRead,
    Capability.DeliverablesWrite,
    Capability.CommentsWrite,
    Capability.CommentsResolve,
    Capability.NotificationsRead,
    Capability.WorkloadRead,
    Capability.TimeLog,
    Capability.VersionsWrite,
    Capability.QaWrite,
    Capability.HandoverWrite,
    Capability.CapacityRead,
    Capability.CapacityWrite,
    Capability.ReportsRead,
    Capability.IntegrationsRead,
    Capability.IntegrationsWrite,
    Capability.AnnotationsWrite,
  ],
  [Role.CreativeContributor]: [
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.TimeLog,
    Capability.VersionsWrite,
    Capability.AnnotationsWrite,
  ],
  [Role.QualityReviewer]: [
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.CommentsResolve,
    Capability.NotificationsRead,
    Capability.QaWrite,
    Capability.AnnotationsWrite,
  ],
  [Role.AgencyAdmin]: [
    Capability.DirectoryRead,
    Capability.IntakeCreate,
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
  ],
  [Role.AgencyContributor]: [
    Capability.DirectoryRead,
    Capability.IntakeCreate,
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
  ],
  [Role.ClientApprover]: [
    Capability.ProjectsRead,
    Capability.DeliverablesRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.ApprovalsDecide,
  ],
  [Role.ThirdPartyVendor]: [Capability.ProjectsRead, Capability.NotificationsRead],
  [Role.FinanceUser]: [
    Capability.DirectoryRead,
    Capability.ProjectsRead,
    Capability.WorkloadRead,
    Capability.CapacityRead,
    Capability.ReportsRead,
    Capability.IntegrationsRead,
  ],
};

/** Union of capabilities across a user's roles. */
export function capabilitiesOf(roles: Role[]): Capability[] {
  const set = new Set<Capability>();
  for (const r of roles) {
    for (const c of ROLE_CAPABILITIES[r] ?? []) set.add(c);
  }
  return [...set];
}

/** True when any of the actor's roles grants `capability`. */
export function can(roles: Role[], capability: Capability): boolean {
  return roles.some((r) => (ROLE_CAPABILITIES[r] ?? []).includes(capability));
}

/** Project lifecycle stages from the planning document (section 2). */
export enum ProjectStatus {
  Intake = 'intake',
  Qualified = 'qualified',
  Planning = 'planning',
  Production = 'production',
  InternalQa = 'internal_qa',
  Proofing = 'proofing',
  ChangeControl = 'change_control',
  Handover = 'handover',
  Done = 'done',
  Blocked = 'blocked',
}

export const PROJECT_STATUSES: readonly ProjectStatus[] = Object.values(ProjectStatus);

/* ------------------------------------------------------------------ */
/* Phase 4: proofing, approvals, handover                              */
/* ------------------------------------------------------------------ */

/** Version lifecycle of a deliverable asset. */
export enum VersionStatus {
  Draft = 'draft',
  UnderQa = 'under_qa',
  InReview = 'in_review',
  ChangesRequested = 'changes_requested',
  Approved = 'approved',
  HandoverReady = 'handover_ready',
}

/** Client/stakeholder decision on a version. */
export enum ApprovalDecision {
  Approved = 'approved',
  ChangesRequested = 'changes_requested',
}

/** Change-request lifecycle (per change-control stage). */
export enum ChangeRequestStatus {
  Draft = 'draft',
  Proposed = 'proposed',
  Accepted = 'accepted',
  Declined = 'declined',
  Superseded = 'superseded',
}

/** Handover package lifecycle. */
export enum HandoverStatus {
  Assembling = 'assembling',
  Ready = 'ready',
  Delivered = 'delivered',
}
