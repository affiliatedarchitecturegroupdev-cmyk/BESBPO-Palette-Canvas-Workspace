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
  ],
  [Role.ProductionLead]: [
    Capability.DirectoryRead,
    Capability.IntakeTriage,
    Capability.ProjectsRead,
    Capability.ProjectsManage,
  ],
  [Role.CreativeContributor]: [Capability.ProjectsRead],
  [Role.QualityReviewer]: [Capability.ProjectsRead],
  [Role.AgencyAdmin]: [Capability.DirectoryRead, Capability.IntakeCreate, Capability.ProjectsRead],
  [Role.AgencyContributor]: [Capability.DirectoryRead, Capability.IntakeCreate, Capability.ProjectsRead],
  [Role.ClientApprover]: [Capability.ProjectsRead],
  [Role.ThirdPartyVendor]: [Capability.ProjectsRead],
  [Role.FinanceUser]: [Capability.DirectoryRead, Capability.ProjectsRead],
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
