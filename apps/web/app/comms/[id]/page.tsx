import Link from 'next/link';
import { Capability, can } from '@palette-canvas/shared';
import { channelMessages, channels, currentEmail, me, users, type V2Message } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import { Badge, EmptyState, PageHeader } from '../../components/ui';
import ChannelView from './ChannelView';

/**
 * A single channel (§11.2). The channel is looked up through `channels()` rather
 * than fetched directly: that endpoint already applies the visibility boundary,
 * so a channel the caller may not see simply is not in the list. There is no
 * `GET /comms/channels/:id` to leak the difference between "missing" and
 * "forbidden".
 */
export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const [listRes, meRes, people] = await Promise.all([channels(email), me(email), users()]);

  const channel = 'error' in listRes ? undefined : listRes.find((c) => c.id === id);
  if (!channel || !email) {
    return (
      <main>
        <Link href="/comms" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          ← channels
        </Link>
        <EmptyState
          title="Channel unavailable"
          body="This channel does not exist, sits outside your engagement, or is internal while your roles are not."
        />
      </main>
    );
  }

  const rootsRes = await channelMessages(email, id);
  const roots: V2Message[] = 'error' in rootsRes ? [] : rootsRes;

  const replyPairs = await Promise.all(
    roots.map(async (m) => {
      const res = await channelMessages(email, id, m.id);
      return [m.id, 'error' in res ? [] : res] as const;
    }),
  );
  const replies: Record<string, V2Message[]> = Object.fromEntries(replyPairs);

  const roles = 'roles' in meRes ? meRes.roles : [];
  const canWrite = can(roles as Parameters<typeof can>[0], Capability.ChannelsWrite);

  return (
    <main>
      <Link href="/comms" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        ← channels
      </Link>
      <PageHeader
        eyebrow={channel.engagement_id ? 'Engagement channel' : 'Division channel'}
        title={channel.name ?? 'Untitled channel'}
        subtitle="Conversation is scoped to this channel's visibility."
        actions={<Badge tone={channel.visibility === 'external' ? 'success' : 'inkFaint'}>{channel.visibility}</Badge>}
      />
      <ChannelView
        apiUrl={BROWSER_API}
        email={email}
        channelId={channel.id}
        visibility={channel.visibility}
        canWrite={canWrite}
        people={people}
        roots={roots}
        replies={replies}
      />
    </main>
  );
}