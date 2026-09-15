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

/** Organisation account model (A-01 §1.1): plan tier + lifecycle status. */
export enum PlanTier {
  Free = 'free',
  Starter = 'starter',
  Pro = 'pro',
  Enterprise = 'enterprise',
}

export enum OrgStatus {
  Active = 'active',
  Suspended = 'suspended',
  Trial = 'trial',
  Expired = 'expired',
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
  /** V2 §14.1 — scoped, time-boxed external stakeholder (item_scope). */
  Guest = 'guest',
}

/**
 * V2 spec §14.2 — the five base roles the permission matrix is normalised to,
 * mapped onto this codebase's finer-grained role vocabulary. Guest is the one
 * genuinely new base role; it is narrower than Client by `item_scope`.
 */
export enum SpecRole {
  Employee = 'employee',
  AccountManager = 'account_manager',
  Management = 'management',
  Client = 'client',
  Guest = 'guest',
}

/** Roles a Guest never holds — used to reject guest claims on staff routes. */
export const GUEST_ROLE = 'guest';

/**
 * A resolved access claim, mirroring the enriched-JWT shape in spec §14.1.
 * `itemScope` is present only for guests; `expiresAt` is mandatory for guests.
 */
export interface AccessClaim {
  role: SpecRole;
  engagementId: string | null;
  itemScope: string | null;
  expiresAt: string | null;
}

export interface UserContext {
  userId: UserId;
  orgId: OrgId;
  roles: Role[];
  /** Workspace/project scopes this user may see; used with visibility levels. */
  scopes: Array<{ workspaceId: WorkspaceId; visibility: VisibilityLevel }>;
  /**
   * V2 spec §14.1 — present when the actor entered via a scoped guest link.
   * `itemScope` is the single item id a guest may see; `expiresAt` is the
   * mandatory time-box. Null fields for every non-guest role.
   */
  itemScope?: string | null;
  expiresAt?: string | null;
  /** Resolved engagement boundary (V2) when the actor is engagement-scoped. */
  engagementId?: string | null;
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
  /* Phase 6 ops + infrastructure */
  CommercialRead = 'commercial.read',
  CommercialWrite = 'commercial.write',
  AutomationsRead = 'automations.read',
  AutomationsWrite = 'automations.write',
  EventsStream = 'events.stream',
  AssetsRead = 'assets.read',
  AssetsWrite = 'assets.write',
  JobsRead = 'jobs.read',
  JobsManage = 'jobs.manage',
  AiOptInManage = 'ai.optin.manage',
  AiReview = 'ai.review',
  LegalHoldManage = 'legal.hold.manage',
  RetentionManage = 'retention.manage',
  PermissionsPropose = 'permissions.propose',
  PermissionsReview = 'permissions.review',
  /* Phase 7 */
  InvitesManage = 'invites.manage',
  InvitesAccept = 'invites.accept',
  TiersManage = 'tiers.manage',
  RecurrenceManage = 'recurrence.manage',
  ViewsManage = 'views.manage',
  ReactionsWrite = 'reactions.write',
  CommentAssetsWrite = 'comment.assets.write',
  MessageToTask = 'message.to_task',
  ApprovalStepsWrite = 'approval.steps.write',
  TechnicalChecksWrite = 'technical.checks.write',
  QaReviewAssign = 'qa.review.assign',
  ExportsManage = 'exports.manage',
  ReportsDeepDive = 'reports.deep_dive',
  RiskManage = 'risk.manage',
  /* V2 spec §9–§15 */
  BoardsRead = 'boards.read',
  BoardsWrite = 'boards.write',
  BoardsManage = 'boards.manage',
  ItemsRead = 'items.read',
  ItemsWrite = 'items.write',
  ItemsDelete = 'items.delete',
  DashboardsRead = 'dashboards.read',
  DashboardsManage = 'dashboards.manage',
  ChannelsRead = 'channels.read',
  ChannelsWrite = 'channels.write',
  MeetingsWrite = 'meetings.write',
  ComplianceRead = 'compliance.read',
  ComplianceClear = 'compliance.clear',
  FilesRead = 'files.read',
  FilesWrite = 'files.write',
  AgentsRun = 'agents.run',
  GuestLinksManage = 'guest.links.manage',
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
    Capability.RiskManage,
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
    Capability.CommercialRead,
    Capability.CommercialWrite,
    Capability.AutomationsRead,
    Capability.AutomationsWrite,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.AssetsWrite,
    Capability.JobsRead,
    Capability.JobsManage,
    Capability.AiOptInManage,
    Capability.AiReview,
    Capability.LegalHoldManage,
    Capability.RetentionManage,
    Capability.PermissionsPropose,
    Capability.PermissionsReview,
    Capability.InvitesManage,
    Capability.InvitesAccept,
    Capability.TiersManage,
    Capability.RecurrenceManage,
    Capability.ViewsManage,
    Capability.ReactionsWrite,
    Capability.CommentAssetsWrite,
    Capability.MessageToTask,
    Capability.ApprovalStepsWrite,
    Capability.TechnicalChecksWrite,
    Capability.QaReviewAssign,
    Capability.ExportsManage,
    Capability.ReportsDeepDive,
    Capability.BoardsRead,
    Capability.BoardsWrite,
    Capability.BoardsManage,
    Capability.ItemsRead,
    Capability.ItemsWrite,
    Capability.ItemsDelete,
    Capability.DashboardsRead,
    Capability.DashboardsManage,
    Capability.ChannelsRead,
    Capability.ComplianceRead,
    Capability.ComplianceClear,
    Capability.FilesRead,
    Capability.AgentsRun,
    Capability.GuestLinksManage,
    Capability.MeetingsWrite,
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
    Capability.RiskManage,
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
    Capability.CommercialRead,
    Capability.CommercialWrite,
    Capability.AutomationsRead,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.AssetsWrite,
    Capability.PermissionsPropose,
    Capability.PermissionsReview,
    Capability.InvitesManage,
    Capability.InvitesAccept,
    Capability.RecurrenceManage,
    Capability.ViewsManage,
    Capability.ReactionsWrite,
    Capability.CommentAssetsWrite,
    Capability.MessageToTask,
    Capability.ApprovalStepsWrite,
    Capability.QaReviewAssign,
    Capability.ReportsDeepDive,
    Capability.BoardsRead,
    Capability.BoardsWrite,
    Capability.BoardsManage,
    Capability.ItemsRead,
    Capability.ItemsWrite,
    Capability.ItemsDelete,
    Capability.DashboardsRead,
    Capability.DashboardsManage,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.ComplianceRead,
    Capability.ComplianceClear,
    Capability.FilesRead,
    Capability.FilesWrite,
    Capability.AgentsRun,
    Capability.GuestLinksManage,
  ],
  [Role.ProductionLead]: [
    Capability.DirectoryRead,
    Capability.IntakeTriage,
    Capability.ProjectsRead,
    Capability.ProjectsManage,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.RiskManage,
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
    Capability.CommercialRead,
    Capability.AutomationsRead,
    Capability.AutomationsWrite,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.AssetsWrite,
    Capability.JobsRead,
    Capability.JobsManage,
    Capability.PermissionsPropose,
    Capability.InvitesManage,
    Capability.InvitesAccept,
    Capability.RecurrenceManage,
    Capability.ViewsManage,
    Capability.ReactionsWrite,
    Capability.CommentAssetsWrite,
    Capability.MessageToTask,
    Capability.ApprovalStepsWrite,
    Capability.TechnicalChecksWrite,
    Capability.QaReviewAssign,
    Capability.ExportsManage,
    Capability.ReportsDeepDive,
    Capability.BoardsRead,
    Capability.BoardsWrite,
    Capability.ItemsRead,
    Capability.ItemsWrite,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.ComplianceRead,
    Capability.ComplianceClear,
    Capability.FilesRead,
    Capability.FilesWrite,
    Capability.AgentsRun,
    Capability.GuestLinksManage,
  ],
  [Role.CreativeContributor]: [
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.TasksWrite,
    Capability.RiskManage,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.TimeLog,
    Capability.VersionsWrite,
    Capability.AnnotationsWrite,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.AssetsWrite,
    Capability.ReactionsWrite,
    Capability.CommentAssetsWrite,
    Capability.MessageToTask,
    Capability.QaReviewAssign,
    Capability.BoardsRead,
    Capability.BoardsWrite,
    Capability.ItemsRead,
    Capability.ItemsWrite,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.ComplianceRead,
    Capability.FilesRead,
    Capability.FilesWrite,
    Capability.AgentsRun,
  ],
  [Role.QualityReviewer]: [
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.CommentsResolve,
    Capability.NotificationsRead,
    Capability.QaWrite,
    Capability.AnnotationsWrite,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.TechnicalChecksWrite,
    Capability.QaReviewAssign,
    Capability.BoardsRead,
    Capability.ItemsRead,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ComplianceRead,
    Capability.ComplianceClear,
    Capability.FilesRead,
    Capability.AgentsRun,
  ],
  [Role.AgencyAdmin]: [
    Capability.DirectoryRead,
    Capability.IntakeCreate,
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.InvitesAccept,
    Capability.BoardsRead,
    Capability.BoardsWrite,
    Capability.ItemsRead,
    Capability.ItemsWrite,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.FilesRead,
    Capability.FilesWrite,
  ],
  [Role.AgencyContributor]: [
    Capability.DirectoryRead,
    Capability.IntakeCreate,
    Capability.ProjectsRead,
    Capability.TasksRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.EventsStream,
    Capability.BoardsRead,
    Capability.ItemsRead,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.FilesRead,
  ],
  [Role.ClientApprover]: [
    Capability.ProjectsRead,
    Capability.DeliverablesRead,
    Capability.CommentsWrite,
    Capability.NotificationsRead,
    Capability.ApprovalsDecide,
    Capability.EventsStream,
    Capability.AssetsRead,
    Capability.InvitesAccept,
    Capability.ReactionsWrite,
    Capability.BoardsRead,
    Capability.ItemsRead,
    Capability.DashboardsRead,
    Capability.ChannelsRead,
    Capability.ChannelsWrite,
    Capability.MeetingsWrite,
    Capability.FilesRead,
  ],
  [Role.ThirdPartyVendor]: [
    Capability.ProjectsRead,
    Capability.NotificationsRead,
    Capability.EventsStream,
    Capability.BoardsRead,
    Capability.ItemsRead,
  ],
  [Role.Guest]: [
    Capability.DeliverablesRead,
    Capability.CommentsWrite,
    Capability.MeetingsWrite,
  ],
  [Role.FinanceUser]: [
    Capability.DirectoryRead,
    Capability.ProjectsRead,
    Capability.WorkloadRead,
    Capability.CapacityRead,
    Capability.ReportsRead,
    Capability.IntegrationsRead,
    Capability.CommercialRead,
    Capability.CommercialWrite,
    Capability.EventsStream,
    Capability.ExportsManage,
    Capability.ReportsDeepDive,
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

/* ------------------------------------------------------------------ */
/* V2 spec §9 — boards, columns, views                                 */
/* ------------------------------------------------------------------ */

/** The 25 column types defined in spec §9.4. Validated at the app layer. */
export enum ColumnType {
  Text = 'text',
  LongText = 'long_text',
  Number = 'number',
  Status = 'status',
  Dropdown = 'dropdown',
  People = 'people',
  Date = 'date',
  Timeline = 'timeline',
  Checkbox = 'checkbox',
  Files = 'files',
  Link = 'link',
  Email = 'email',
  Phone = 'phone',
  Location = 'location',
  Rating = 'rating',
  Progress = 'progress',
  Formula = 'formula',
  Dependency = 'dependency',
  ConnectBoard = 'connect_board',
  Tags = 'tags',
  Vote = 'vote',
  Button = 'button',
  Duration = 'duration',
  CreationLog = 'creation_log',
  LastUpdated = 'last_updated',
}

export const COLUMN_TYPES: readonly ColumnType[] = Object.values(ColumnType);

/** Types the platform creates itself; never user-addable (spec §9.4). */
export const SYSTEM_COLUMN_TYPES: readonly ColumnType[] = [
  ColumnType.CreationLog,
  ColumnType.LastUpdated,
];

/** The six views from spec §9.5. */
export enum ViewType {
  Table = 'table',
  Kanban = 'kanban',
  Gantt = 'gantt',
  Calendar = 'calendar',
  Workload = 'workload',
  Chart = 'chart',
  Gallery = 'gallery',
}

/**
 * The fixed semantic-role vocabulary from spec §10.2. A column carrying one of
 * these is aggregated cross-board; a null role is board-local only.
 */
export enum SemanticRole {
  QaBrand = 'qa_brand',
  QaBrief = 'qa_brief',
  QaTechnical = 'qa_technical',
  ProductionStage = 'production_stage',
  CapacityHours = 'capacity_hours',
  TurnaroundStart = 'turnaround_start',
  TurnaroundEnd = 'turnaround_end',
  RevenueValue = 'revenue_value',
  StaffedPerson = 'staffed_person',
}

export const SEMANTIC_ROLES: readonly SemanticRole[] = Object.values(SemanticRole);

/** The three-part QA gate (spec §7.7/§9.4) as semantic roles. */
export const QA_GATE_ROLES: readonly SemanticRole[] = [
  SemanticRole.QaBrand,
  SemanticRole.QaBrief,
  SemanticRole.QaTechnical,
];

/**
 * Capacity & Seat Management model (spec §7.7). These are the benchmarked
 * figures the utilisation calculation must compute against — not arbitrary.
 */
export const SEAT_MODEL = {
  /** Raw contracted seat hours per month. */
  rawMonthlyHours: 173.6,
  /** Non-billable allowance (meetings, admin, internal). */
  nonBillablePct: 0.21,
  /** Productive monthly hours after the allowance — the utilisation ceiling. */
  productiveMonthlyHours: 137.1,
  /** Account/Production Manager bounded-broad ratio (seats). */
  accountManagerSeats: 12,
} as const;

/** Utilisation of a seat against its productive ceiling, as a percentage. */
export function seatUtilisationPct(loggedHours: number): number {
  if (SEAT_MODEL.productiveMonthlyHours <= 0) return 0;
  return Math.round((loggedHours / SEAT_MODEL.productiveMonthlyHours) * 1000) / 10;
}

/* ------------------------------------------------------------------ */
/* V2 spec §12 — AI agent governance                                   */
/* ------------------------------------------------------------------ */

/** Autonomy classification from spec §12.1. */
export enum AgentAutonomy {
  ProposeOnly = 'propose_only',
  ActAndLog = 'act_and_log',
  BlockAndFlag = 'block_and_flag',
}

export interface AgentDefinition {
  key: string;
  name: string;
  autonomy: AgentAutonomy;
  /** Semantic roles / tables the agent reads (spec §12.6). */
  reads: string[];
  summary: string;
  /** True when a human must approve before the suggestion takes effect. */
  requiresApproval: boolean;
}

/** The agent catalog from spec §12.2. */
export const AGENT_CATALOG: readonly AgentDefinition[] = [
  {
    key: 'brief_analysis',
    name: 'Brief Analysis Agent',
    autonomy: AgentAutonomy.ProposeOnly,
    reads: ['items.column_values', SemanticRole.CapacityHours],
    summary: 'Flags missing fields, ambiguous scope; suggests an estimated hour range.',
    requiresApproval: true,
  },
  {
    key: 'white_label_guard',
    name: 'White-Label Compliance Guard',
    autonomy: AgentAutonomy.BlockAndFlag,
    reads: ['files', 'compliance_checks', SemanticRole.QaTechnical],
    summary: 'Blocks the technical QA check until metadata/filename/attribution findings clear.',
    requiresApproval: true,
  },
  {
    key: 'kpi_reminder',
    name: 'KPI/Reminder Agent',
    autonomy: AgentAutonomy.ActAndLog,
    reads: [SemanticRole.TurnaroundStart, SemanticRole.TurnaroundEnd],
    summary: 'Fires reminder notifications for overdue reviews or unstaffed briefs.',
    requiresApproval: false,
  },
  {
    key: 'writing_assistant',
    name: 'Writing Assistant',
    autonomy: AgentAutonomy.ProposeOnly,
    reads: [],
    summary: 'Inline drafting help; never sends anything itself.',
    requiresApproval: true,
  },
  {
    key: 'research',
    name: 'Research Agent',
    autonomy: AgentAutonomy.ProposeOnly,
    reads: [],
    summary: 'Scoped, logged web search — every query and result set audited.',
    requiresApproval: true,
  },
  {
    key: 'asset_sourcing',
    name: 'Asset Sourcing Agent',
    autonomy: AgentAutonomy.ProposeOnly,
    reads: [],
    summary: 'Queries Unsplash/Pexels/Pixabay for candidate imagery; human selects.',
    requiresApproval: true,
  },
];

/** Compliance check kinds from spec §12.5. */
export enum ComplianceCheckType {
  MetadataScan = 'metadata_scan',
  FilenameScan = 'filename_scan',
  AttributionScan = 'attribution_scan',
}

/** Channel visibility boundary from spec §11.2. Never silently changed. */
export enum ChannelVisibility {
  Internal = 'internal',
  External = 'external',
}

export enum ChannelType {
  Instant = 'instant',
  Threaded = 'threaded',
  Direct = 'direct',
}

/** Dashboard scope from spec §10.5. */
export enum DashboardScopeRole {
  Management = 'management',
  AccountManager = 'account_manager',
  Client = 'client',
}

export enum WidgetAggregation {
  Sum = 'sum',
  Avg = 'avg',
  Count = 'count',
  Min = 'min',
  Max = 'max',
  PassRate = 'pass_rate',
}

/** File origin — drives the integration round-trip tracking (spec §13.1). */
export enum FileSource {
  NativeUpload = 'native_upload',
  AdobePlugin = 'adobe_plugin',
  CanvaApp = 'canva_app',
  DropboxSync = 'dropbox_sync',
}
