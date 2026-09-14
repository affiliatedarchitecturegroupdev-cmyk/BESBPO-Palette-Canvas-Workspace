import Link from 'next/link';
import { Card, PageHeader } from '../components/ui';

const shortcuts = [
  { keys: 'g then h', action: 'Go to home / overview' },
  { keys: 'g then p', action: 'Go to projects' },
  { keys: 'g then i', action: 'Go to intake inbox' },
  { keys: 'g then n', action: 'Go to notifications' },
  { keys: '/', action: 'Focus project navigation' },
];

const roles = [
  { name: 'Platform owner', desc: 'Full control — org, identity, security, billing, and every capability.' },
  { name: 'Operations director', desc: 'Studio-wide delivery: intake, projects, capacity, commercial and reports.' },
  { name: 'Account manager', desc: 'Client-facing orchestration and commercial visibility for their agencies.' },
  { name: 'Production lead', desc: 'Assigns work, runs quality gates, and keeps projects moving.' },
  { name: 'Creative contributor', desc: 'Works tasks and deliverables, logs time, hands off for QA.' },
  { name: 'Quality reviewer', desc: 'Owns QA checklists, sign-off and proofing gates.' },
  { name: 'Client approver', desc: 'Sees brand-scoped work and makes approval decisions.' },
  { name: 'Finance user', desc: 'Rate cards, budgets, invoice-ready milestones and reports.' },
];

/** Help — quick reference for getting around the workspace. */
export default function HelpPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Workspace"
        title="Help"
        subtitle="A quick reference for getting the most out of the workspace."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Keyboard</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)', margin: '8px 0 12px' }}>Pressing <kbd>g</kbd> then a letter jumps to a surface. (Coming soon.)</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {shortcuts.map((s) => (
              <li key={s.action} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <code style={{ background: 'var(--brand-base)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', fontSize: 11.5 }}>
                  {s.keys}
                </code>
                <span style={{ color: 'var(--ink-dim)' }}>{s.action}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Quick start</h2>
          <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-dim)', display: 'grid', gap: 8, lineHeight: 1.5 }}>
            <li><Link href="/intake/new">Capture a brief</Link> — start from the intake form.</li>
            <li><Link href="/intake">Triage it</Link> — qualify, estimate and route to a template.</li>
            <li><Link href="/projects">Convert to a project</Link> — the board opens with phases, roles and milestones.</li>
            <li><Link href="/notifications">Watch the inbox</Link> — mentions, assignments, and delivery signals land there.</li>
          </ol>
        </Card>
      </div>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 18, margin: '28px 0 12px' }}>Roles at a glance</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {roles.map((r) => (
          <Card key={r.name} style={{ padding: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{r.name}</div>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.5 }}>{r.desc}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}