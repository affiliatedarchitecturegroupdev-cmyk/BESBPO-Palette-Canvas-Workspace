import { currentEmail, ssoConfigs } from '@/lib/api';
import { Badge, Card, DataTable, EmptyState, PageHeader } from '../../components/ui';

/** P6-06: SSO/SCIM configuration (scaffolding — OIDC dance lands later). */
export default async function SsoPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const list = await ssoConfigs(email);
  if ('error' in list) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        SSO configuration is restricted to platform owner and operations director.
      </p>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Govern"
        title="Single sign-on"
        subtitle="OIDC provider configuration per organisation. SCIM provisioning is available via POST /identity/sso/scim/users with the configured bearer token."
      />
      <DataTable
        columns={[
          { key: 'issuer', header: 'Issuer', render: (s) => <span style={{ wordBreak: 'break-all', color: 'var(--ink)', fontWeight: 600 }}>{s.issuer}</span> },
          { key: 'client', header: 'Client ID', render: (s) => <code style={{ fontSize: 12 }}>{s.client_id}</code> },
          { key: 'mfa', header: 'MFA', render: (s) => (s.mfa_required ? <Badge status="blocked">required</Badge> : <Badge status="draft">optional</Badge>) },
          { key: 'created', header: 'Configured', render: (s) => <span style={{ color: 'var(--ink-faint)' }}>{s.created_at.slice(0, 10)}</span> },
        ]}
        rows={list}
        empty={<EmptyState title="No SSO provider configured" body="Add an OIDC provider to enable single sign-on for the organisation." />}
      />
      <Card style={{ padding: 14, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
          Configure via <code>POST /identity/sso</code> (identity.sso.manage capability).
        </p>
      </Card>
    </main>
  );
}
