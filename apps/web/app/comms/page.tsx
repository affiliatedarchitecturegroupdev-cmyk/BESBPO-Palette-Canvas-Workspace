import Link from 'next/link';
import { channels, currentEmail } from '@/lib/api';
import { Badge, EmptyState, PageHeader } from '../components/ui';

/**
 * V2 comms index (§11). Channels are rendered exactly as the API returns them.
 *
 * The visibility boundary is the server's job: `listChannels` pins a client to
 * `external` in SQL and a guest to nothing at all. Re-filtering here would be a
 * security bug dressed as a UI tweak — if an internal channel ever arrives, the
 * correct response is to render it and let that be visible, not to hide it
 * client-side and leave the leak in place.
 */
export default async function CommsPage() {
  const email = await currentEmail();
  const res = await channels(email);
  if ('error' in res) {
    return (
      <main>
        <PageHeader eyebrow="Connect" title="Channels" subtitle="Conversation scoped to an engagement." />
        <EmptyState
          title="Channels unavailable"
          body="Your roles do not include channel access, or the API is unreachable."
        />
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Connect"
        title="Channels"
        subtitle="Conversation scoped to an engagement. Internal channels never reach a client."
      />
      {res.length === 0 ? (
        <EmptyState
          title="No channels yet"
          body="Channels appear here once someone opens one for an engagement."
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {res.map((c) => (
            <li
              key={c.id}
              style={{
                border: '1px solid var(--line)',
                background: 'var(--paper-raise)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: '1 1 240px' }}>
                <Link href={`/comms/${c.id}`} style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 14 }}>
                  {c.name ?? 'Untitled channel'}
                </Link>
                <span style={{ display: 'block', color: 'var(--ink-faint)', fontSize: 11.5, marginTop: 2 }}>
                  {c.channel_type} · {c.engagement_id ? 'engagement' : 'division'}
                </span>
              </span>
              <Badge tone={c.visibility === 'external' ? 'success' : 'inkFaint'}>{c.visibility}</Badge>
              <Link href={`/comms/${c.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                open →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}