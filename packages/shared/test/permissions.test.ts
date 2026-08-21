import {
  Role,
  VisibilityLevel,
  UserContext,
  canSeeVisibility,
  Capability,
  can,
  capabilitiesOf,
} from '../src';

function ctx(roles: Role[], visibilityScope: VisibilityLevel[]): UserContext {
  return {
    userId: 'u1',
    orgId: 'org1',
    roles,
    scopes: visibilityScope.map((v) => ({ workspaceId: 'demo', visibility: v })),
  };
}

// Platform owner sees everything
{
  const user = ctx([Role.PlatformOwner], []);
  if (!canSeeVisibility(user, VisibilityLevel.Internal)) {
    throw new Error('Platform owner should see internal');
  }
}

// Client approver cannot see Internal
{
  const user = ctx([Role.ClientApprover], [VisibilityLevel.ClientShared]);
  if (canSeeVisibility(user, VisibilityLevel.Internal)) {
    throw new Error('Client approver must not see internal');
  }
}

// Vendor has no portfolio discovery — restricted third party requires explicit scope
{
  const user = ctx([Role.ThirdPartyVendor], []);
  if (canSeeVisibility(user, VisibilityLevel.RestrictedThirdParty)) {
    throw new Error('Vendor must need explicit scope');
  }
}

// Client approver sees client-shared only when scoped
{
  const user = ctx([Role.ClientApprover], [VisibilityLevel.ClientShared]);
  if (!canSeeVisibility(user, VisibilityLevel.ClientShared)) {
    throw new Error('Scoped client approver should see client-shared');
  }
}

/* Phase 2 capability matrix checks */

// Roles without manage capabilities
{
  if (can([Role.ClientApprover], Capability.IntakeTriage)) {
    throw new Error('client approver must not triage');
  }
}
{
  if (can([Role.ThirdPartyVendor], Capability.AuditRead)) {
    throw new Error('vendor must not read audit');
  }
}
{
  if (!can([Role.AccountManager], Capability.IntakeConvert)) {
    throw new Error('account manager must convert briefs');
  }
}
{
  const caps = capabilitiesOf([Role.ClientApprover]);
  if (caps.length !== 5 || !caps.includes(Capability.CommentsWrite) ||
      !caps.includes(Capability.NotificationsRead) || !caps.includes(Capability.ApprovalsDecide) ||
      !caps.includes(Capability.DeliverablesRead)) {
    throw new Error('client approver has projects.read + deliverables.read + comments.write + notifications.read + approvals.decide');
  }
}

/* Phase 3 capability matrix checks */

// Internal production roles write tasks; external roles do not
{
  if (!can([Role.CreativeContributor], Capability.TasksWrite)) {
    throw new Error('creative contributor must write tasks');
  }
  if (can([Role.ClientApprover], Capability.TasksWrite)) {
    throw new Error('client approver must not write tasks');
  }
  if (can([Role.AgencyAdmin], Capability.TasksWrite)) {
    throw new Error('agency admin must not write tasks');
  }
}

// Workload visibility: leadership + finance only
{
  if (!can([Role.OperationsDirector], Capability.WorkloadRead) || !can([Role.FinanceUser], Capability.WorkloadRead)) {
    throw new Error('ops + finance must read workload');
  }
  if (can([Role.CreativeContributor], Capability.WorkloadRead)) {
    throw new Error('creative contributor must not read workload');
  }
}

// Only internal review roles resolve comments
{
  if (!can([Role.QualityReviewer], Capability.CommentsResolve)) {
    throw new Error('quality reviewer must resolve comments');
  }
  if (can([Role.ClientApprover], Capability.CommentsResolve)) {
    throw new Error('client approver must not resolve comments');
  }
}

/* Phase 4 capability matrix checks */

// Version write: creative contributors + leads + ops; QA/AM must not upload versions
{
  if (!can([Role.CreativeContributor], Capability.VersionsWrite)) {
    throw new Error('creative contributor must write versions');
  }
  if (can([Role.QualityReviewer], Capability.VersionsWrite) || can([Role.AccountManager], Capability.VersionsWrite)) {
    throw new Error('non-creative-internal must not write versions');
  }
}

// Approval request: account manager + ops only; decision: client approver only
{
  if (!can([Role.AccountManager], Capability.ApprovalsRequest)) {
    throw new Error('account manager must request approvals');
  }
  if (can([Role.QualityReviewer], Capability.ApprovalsRequest) || can([Role.CreativeContributor], Capability.ApprovalsRequest)) {
    throw new Error('production/QA must not request external approval');
  }
  if (!can([Role.ClientApprover], Capability.ApprovalsDecide)) {
    throw new Error('client approver must decide approvals');
  }
  if (can([Role.AccountManager], Capability.ApprovalsDecide) || can([Role.ProductionLead], Capability.ApprovalsDecide)) {
    throw new Error('internal roles must not decide client approvals');
  }
}

// QA checklist write: quality reviewer + ops only
{
  if (!can([Role.QualityReviewer], Capability.QaWrite) || !can([Role.OperationsDirector], Capability.QaWrite)) {
    throw new Error('QA reviewer + ops must write QA checklists');
  }
  if (can([Role.CreativeContributor], Capability.QaWrite)) {
    throw new Error('creative contributor must not write QA checklists');
  }
}

// Change control write: account manager + ops only
{
  if (!can([Role.AccountManager], Capability.ChangeWrite)) {
    throw new Error('account manager must write change requests');
  }
  if (can([Role.CreativeContributor], Capability.ChangeWrite) || can([Role.ClientApprover], Capability.ChangeWrite)) {
    throw new Error('non-commercial roles must not write change requests');
  }
}

// Handover write: production lead + ops only
{
  if (!can([Role.ProductionLead], Capability.HandoverWrite)) {
    throw new Error('production lead must write handover');
  }
  if (can([Role.ClientApprover], Capability.HandoverWrite) || can([Role.AgencyContributor], Capability.HandoverWrite)) {
    throw new Error('external roles must not write handover');
  }
}

console.log('permission tests passed');
