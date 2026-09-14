import Link from 'next/link';
import { currentEmail, inbox, projects, agencies, notifications } from '@/lib/api';
import { Card, StatCard, Badge, PageHeader, EmptyState } from './components/ui';

export default async function Home() {
  const email = await currentEmail();
  const [inboxRes, projectsRes, agencyRes, notifRes] = await Promise.all([
    inbox(email),
    projects(email),
    agencies(email),
    email ? notifications(email) : Promise.resolve(null),
  ]);
  const briefs = Array.isArray(inboxRes) ? inboxRes : [];
  const projectList = Array.isArray(projectsRes) ? projectsRes : [];
  const agencyList = Array.isArray(agencyRes) ? agencyRes : [];
  const openBriefs = briefs.filter((b) => b.status === 'inbox');
  const unread = notifRes && 'unread' in notifRes ? notifRes.unread : 0;

  if (!email) {
    return (
      <main>
        <PageHeader
          eyebrow="Creative BPO operations"
          title="Palette Canvas Workspace"
          subtitle="The production operating system for creative delivery — intake to handover."
        />
        <Card style={{ padding: '48px 32px', display: 'grid', placeItems: 'center', gap: 12, textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-dim)', margin: 0 }}>Choose a workspace identity to begin.</p>
          <Link href="/notifications" style={{ fontSize: 14 }}>Open the app →</Link>
        </Card>
      </main>
    );
  }

  const active = projectList.filter((p) => !['done', 'closed'].includes(p.status)).length;
  const qualified = briefs.filter((b) => b.status === 'qualified').length;

  return (
    <main>
      <PageHeader
        eyebrow="Overview"
        title="Workspace dashboard"
        subtitle="A live read on the production floor — intake pressure, portfolio pulse, and the attention inbox."
      />

      {/* KPI row (mobile-first grid) */}
      <section
        className="pc-fade-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Intake backlog"
          value={openBriefs.length}
          detail={`${briefs.length} total · ${qualified} qualified`}
          href="/intake"
          trend={openBriefs.length > 5 ? 'warn' : openBriefs.length > 0 ? 'flat' : 'up'}
        />
        <StatCard
          label="Active projects"
          value={active}
          detail={projectList[0]?.status ?? '—'}
          href="/projects"
          trend="flat"
        />
        <StatCard
          label="Agencies"
          value={agencyList.length}
          detail="scoped to your access"
          href="/directory"
          trend="flat"
        />
        <StatCard
          label="Unread"
          value={unread}
          detail="notifications"
          href="/notifications"
          trend={unread > 0 ? 'warn' : 'flat'}
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Intake attention panel */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Intake attention</h2>
            <Link href="/intake" style={{ fontSize: 12, color: 'var(--accent)' }}>open →</Link>
          </div>
          {briefs.length === 0 ? (
            <EmptyState title="No intake pressure" body="When briefs arrive from email, Slack or forms they'll queue here." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {briefs.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/intake/${b.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--brand-base)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.title}
                    </span>
                    <Badge status={b.status}>{b.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Portfolio pulse panel */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Project pulse</h2>
            <Link href="/projects" style={{ fontSize: 12, color: 'var(--accent)' }}>view all →</Link>
          </div>
          {projectList.length === 0 ? (
            <EmptyState title="No projects yet" body="Convert a qualified brief from the intake inbox to start one." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {projectList.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--brand-base)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    <Badge status={p.status}>{p.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Dispatch / quick actions */}
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17, marginBottom: 12 }}>Dispatch</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickAction href="/intake/new" label="New brief" icon="✎" />
            <QuickAction href="/calendar" label="Calendar" icon="▦" />
            <QuickAction href="/reports" label="Reports" icon="◰" />
            <QuickAction href="/library" label="Asset library" icon="▤" />
          </div>
        </Card>
      </div>
    </main>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 12px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--brand-base)',
        border: '1px solid var(--line)',
        color: 'var(--ink-dim)',
        textDecoration: 'none',
        fontSize: 13,
        transition: 'border-color 140ms ease, transform 80ms ease',
      }}
    >
      <span aria-hidden style={{ fontSize: 16, color: 'var(--accent)' }}>{icon}</span>
      {label}
    </Link>
  );
}
