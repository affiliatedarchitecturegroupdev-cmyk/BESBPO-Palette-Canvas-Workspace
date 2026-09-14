import Link from 'next/link';
import { calendar, currentEmail, deliverables, projects } from '@/lib/api';
import { Badge, Card, EmptyState, PageHeader, toneFor } from '../components/ui';

interface CalEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  kind: 'task' | 'deliverable';
  projectId: string;
  projectName: string;
}

/** Calendar — an aggregate view of upcoming task and deliverable due dates
 *  across the portfolio the signed-in user can access. */
export default async function CalendarPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const projRes = await projects(email);
  if ('error' in projRes) {
    return <EmptyState title="Calendar unavailable" body="Sign in with access to the workspace to view scheduled work." />;
  }

  const rows = await Promise.all(
    projRes.map(async (p) => {
      const [calRes, dlRes] = await Promise.all([calendar(email, p.id), deliverables(email, p.id)]);
      const tasks = Array.isArray(calRes) ? calRes : [];
      const dls = Array.isArray(dlRes) ? dlRes : [];
      const taskEvents: CalEvent[] = tasks
        .filter((t) => t.due_date)
        .map((t) => ({
          id: t.id,
          title: t.title,
          date: t.due_date as string,
          status: t.status,
          kind: 'task' as const,
          projectId: p.id,
          projectName: p.name,
        }));
      const dlEvents: CalEvent[] = dls
        .filter((d) => d.due_date)
        .map((d) => ({
          id: d.id,
          title: d.name,
          date: d.due_date as string,
          status: d.status,
          kind: 'deliverable' as const,
          projectId: p.id,
          projectName: p.name,
        }));
      return [...taskEvents, ...dlEvents];
    }),
  );
  const events = rows.flat().sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const overdue = events.filter((e) => e.date < today && e.status !== 'done');

  const grouped = groupByDay(upcoming);

  return (
    <main>
      <PageHeader
        eyebrow="Delivery timeline"
        title="Calendar"
        subtitle="All task and deliverable due dates across your portfolio, in one view."
      />
      {overdue.length > 0 && (
        <Card
          style={{
            padding: 14,
            marginBottom: 16,
            borderLeft: '3px solid var(--status-overdue)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: 'var(--status-overdue)', fontWeight: 700, fontSize: 13 }}>
            {overdue.length} overdue
          </span>
          <span style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>past due and not marked done</span>
        </Card>
      )}

      {grouped.length === 0 ? (
        <EmptyState title="Nothing scheduled" body="Upcoming due dates will appear here as tasks and deliverables are planned." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {grouped.map(([day, list]) => (
            <DayGroup key={day} day={day} events={list} />
          ))}
        </div>
      )}
    </main>
  );
}

function DayGroup({ day, events }: { day: string; events: CalEvent[] }) {
  const label = formatDay(day);
  const isToday = day === new Date().toISOString().slice(0, 10);
  return (
    <Card style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          color: isToday ? 'var(--accent)' : 'var(--ink-dim)',
          fontSize: 12,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {events.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-base)',
              border: '1px solid var(--line)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: toneFor(e.status),
                boxShadow: `0 0 0 3px ${toneFor(e.status)}22`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.title}
              </div>
              <Link href={`/projects/${e.projectId}`} style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                {e.projectName}
              </Link>
            </div>
            <Badge status={e.status}>{e.kind}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function groupByDay(events: CalEvent[]): [string, CalEvent[]][] {
  const map = new Map<string, CalEvent[]>();
  for (const e of events) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return [...map.entries()];
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}