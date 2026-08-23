import { currentEmail, inbox, projects, agencies, notifications } from '@/lib/api';

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
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>Palette Canvas Workspace</h1>
        <p style={{ color: 'var(--ink-dim)' }}>
          Phase 3 — production workspace. Boards, dependencies, comments, notifications.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 0 }}>Workspace overview</h1>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginTop: 20,
        }}
      >
        <Card title="Intake inbox" value={briefs.length.toString()} detail={`${openBriefs.length} awaiting triage`} href="/intake" />
        <Card title="Active projects" value={projectList.length.toString()} detail={projectList[0]?.status ?? '—'} href="/projects" />
        <Card title="Agencies" value={agencyList.length.toString()} detail="scoped to your access" href="/directory" />
        <Card title="Unread" value={unread.toString()} detail="notifications" href="/notifications" />
      </section>
    </main>
  );
}

function Card({ title, value, detail, href }: { title: string; value: string; detail: string; href: string }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          border: '1px solid var(--line)',
          background: 'var(--paper-raise)',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontSize: 42, fontFamily: 'var(--serif)', margin: '8px 0' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{detail}</div>
      </div>
    </a>
  );
}
