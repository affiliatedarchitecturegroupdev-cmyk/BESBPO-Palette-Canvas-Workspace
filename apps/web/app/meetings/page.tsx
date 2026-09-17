import { Capability, can } from '@palette-canvas/shared';
import { currentEmail, me, meetings } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import { EmptyState, PageHeader } from '../components/ui';
import MeetingActions from './MeetingActions';

/**
 * Meetings (§11.4). Attendance is recorded when someone joins, never assumed,
 * so a meeting here shows a join action rather than an attendee list the
 * product cannot yet substantiate.
 *
 * Listing needs `meetings.read`; scheduling and joining need `meetings.write`.
 * A quality_reviewer holds the former and not the latter — that split is the
 * point of the two capabilities, so the page states it rather than hiding it.
 */
export default async function MeetingsPage() {
  const email = await currentEmail();
  const [res, meRes] = await Promise.all([meetings(email), me(email)]);
  if ('error' in res) {
    return (
      <main>
        <PageHeader eyebrow="Connect" title="Meetings" subtitle="Meetings across the engagements you can see." />
        <EmptyState
          title="Meetings unavailable"
          body="Your roles do not include meeting access, or the API is unreachable."
        />
      </main>
    );
  }

  const roles = 'roles' in meRes ? meRes.roles : [];
  const canWrite = can(roles as Parameters<typeof can>[0], Capability.MeetingsWrite);

  return (
    <main>
      <PageHeader
        eyebrow="Connect"
        title="Meetings"
        subtitle="Meetings across the engagements you can see. Attendance is recorded when you join."
      />
      {!canWrite && (
        <p
          style={{
            margin: '0 0 16px',
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-base)',
            color: 'var(--ink-dim)',
            fontSize: 12.5,
          }}
        >
          Your roles give you read access to meetings but not the ability to schedule or join them.
        </p>
      )}
      {res.length === 0 ? (
        <EmptyState title="No meetings scheduled" body="Meetings appear here once someone books one." />
      ) : (
        <MeetingActions apiUrl={BROWSER_API} email={email ?? ''} meetings={res} canWrite={canWrite} />
      )}
    </main>
  );
}