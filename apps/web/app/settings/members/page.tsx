import { currentEmail, me, members, invites } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import { Card, PageHeader } from '../../components/ui';
import MemberActions from './MemberActions';

/**
 * A-04 members admin. The API gates every action on `invites.manage`; this
 * page renders the unavailable state rather than an empty one when the caller
 * lacks it, so "no access" is never mistaken for "no members".
 */
export default async function MembersPage() {
  const email = await currentEmail();
  const [meRes, memberRes, inviteRes] = await Promise.all([
    me(email),
    members(email),
    invites(email),
  ]);

  if ('error' in meRes) {
    return (
      <main>
        <PageHeader eyebrow="Workspace" title="Members" subtitle="Invite people and manage their access." />
        <Card style={{ padding: 20 }}>
          <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, margin: 0 }}>
            Choose a workspace identity from the top-bar picker to manage members.
          </p>
        </Card>
      </main>
    );
  }

  if ('error' in memberRes || 'error' in inviteRes) {
    return (
      <main>
        <PageHeader eyebrow="Workspace" title="Members" subtitle="Invite people and manage their access." />
        <Card style={{ padding: 20 }}>
          <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, margin: 0 }}>
            Members are restricted to operations, account management, and production
            leadership roles. Your current roles do not include member administration.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Workspace"
        title="Members"
        subtitle="Invite people, review their role bindings, and revoke access."
      />
      <MemberActions
        apiUrl={BROWSER_API}
        email={email ?? ''}
        orgId={meRes.orgId}
        members={memberRes}
        pendingInvites={inviteRes}
      />
    </main>
  );
}