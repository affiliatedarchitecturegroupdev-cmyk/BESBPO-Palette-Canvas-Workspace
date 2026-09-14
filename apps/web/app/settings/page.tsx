import Link from 'next/link';
import { currentEmail, me } from '@/lib/api';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';

/** Settings hub — workspace identity, plan, and governance doors. */
export default async function SettingsPage() {
  const email = await currentEmail();
  const meRes = await me(email);
  const identity = 'userId' in meRes ? meRes : null;

  return (
    <main>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="Identity, access, and governance for the workspace."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Identity</h2>
          {!identity ? (
            <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 8 }}>
              Choose a workspace identity from the top-bar picker to see your context.
            </p>
          ) : (
            <dl style={{ margin: '14px 0 0', display: 'grid', gap: 10, fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <dt style={{ color: 'var(--ink-faint)' }}>Email</dt>
                <dd style={{ margin: 0, color: 'var(--ink)' }}>{email}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <dt style={{ color: 'var(--ink-faint)' }}>User ID</dt>
                <dd style={{ margin: 0, color: 'var(--ink-dim)', fontSize: 12.5 }}>{identity.userId.slice(0, 12)}…</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <dt style={{ color: 'var(--ink-faint)' }}>Organisation</dt>
                <dd style={{ margin: 0, color: 'var(--ink-dim)' }}>{identity.orgId.slice(0, 12)}…</dd>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <dt style={{ color: 'var(--ink-faint)' }}>Roles</dt>
                <dd style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {identity.roles.map((r) => (
                    <Badge key={r} tone="accent">{r.replace(/_/g, ' ')}</Badge>
                  ))}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Access & governance</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5, margin: '8px 0 14px' }}>
            Identity, security and compliance surfaces live under governance.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <SettingLink href="/settings/sso" label="Single sign-on" detail="OIDC provider configuration" />
            <SettingLink href="/audit" label="Audit explorer" detail="Search the full action trail" />
            <SettingLink href="/account-health" label="Account health" detail="Agency engagement metrics" />
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>Workspace</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5, margin: '8px 0 14px' }}>
            Operating knowledge and delivery standards.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <SettingLink href="/library" label="Knowledge library" detail="Guidelines, briefs, QA + handover packs" />
            <SettingLink href="/integrations" label="Integrations" detail="Outbound webhook subscriptions" />
            <SettingLink href="/templates" label="Service templates" detail="Phases, gates and SLA targets" />
          </div>
        </Card>
      </div>
    </main>
  );
}

function SettingLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '11px 12px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--brand-base)',
        border: '1px solid var(--line)',
        textDecoration: 'none',
        transition: 'border-color 140ms ease',
      }}
    >
      <span>
        <span style={{ display: 'block', color: 'var(--ink)', fontSize: 13.5, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', color: 'var(--ink-faint)', fontSize: 11.5, marginTop: 2 }}>{detail}</span>
      </span>
      <span style={{ color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>→</span>
    </Link>
  );
}