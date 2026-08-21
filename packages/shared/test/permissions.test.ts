import { Role, VisibilityLevel, UserContext, canSeeVisibility } from '../src';

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

console.log('permission tests passed');
