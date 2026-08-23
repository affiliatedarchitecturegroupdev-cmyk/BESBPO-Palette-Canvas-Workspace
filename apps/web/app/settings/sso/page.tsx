import { currentEmail, ssoConfigs } from '@/lib/api';

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
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Single sign-on</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        OIDC provider configuration per organisation. SCIM provisioning is available at
        <code> POST /identity/sso/scim/users</code> with the configured bearer token.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Issuer</th><th>Client ID</th><th>MFA</th><th>Configured</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)', wordBreak: 'break-all' }}>{s.issuer}</td>
              <td><code style={{ fontSize: 12 }}>{s.client_id}</code></td>
              <td>{s.mfa_required ? 'required' : 'optional'}</td>
              <td style={{ color: 'var(--ink-faint)' }}>{s.created_at.slice(0, 10)}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '20px 0', color: 'var(--ink-faint)' }}>No SSO provider configured.</td></tr>
          )}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 20 }}>
        Configure via <code>POST /identity/sso</code> (identity.sso.manage capability).
      </p>
    </main>
  );
}
