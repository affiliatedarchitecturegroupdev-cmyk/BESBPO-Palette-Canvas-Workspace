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
  if (caps.length !== 3 || !caps.includes(Capability.CommentsWrite) || !caps.includes(Capability.NotificationsRead)) {
    throw new Error('client approver has projects.read + comments.write + notifications.read');
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

console.log('permission tests passed');
