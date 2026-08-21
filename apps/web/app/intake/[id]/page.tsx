import Link from 'next/link';
import { currentEmail, brief, templates } from '@/lib/api';
import { API_URL } from '@/lib/config';
import TriagePanel from './TriagePanel';

export default async function BriefDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const res = await brief(email, id);
  if ('error' in res || !email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Brief unavailable — check your access.</p>;
  }
  const tplRes = await templates(email);
  const tpl = Array.isArray(tplRes) ? tplRes.find((t) => t.id === res.template_id) : undefined;

  return (
    <main>
      <Link href="/intake" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        ← inbox
      </Link>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginTop: 12 }}>
        <section style={{ flex: 1, minWidth: 320 }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: '4px 0' }}>{res.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            status: <strong>{res.status}</strong> · channel {res.source_channel} · confidentiality{' '}
            {res.confidentiality}
            {res.requested_date && <> · requested {res.requested_date}</>}
          </p>
          {tpl && (
            <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              template: {tpl.name} v{tpl.version}
            </p>
          )}
          <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 20 }}>Brief fields</h3>
          <dl style={{ fontSize: 13 }}>
            {Object.entries(res.fields).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <dt style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{k}</dt>
                <dd style={{ margin: 0, color: 'var(--ink)' }}>{String(v)}</dd>
              </div>
            ))}
          </dl>
          {res.attachments.length > 0 && (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>Attachments</h3>
              <ul>
                {res.attachments.map((a, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {a.label}: {a.url}
                  </li>
                ))}
              </ul>
            </>
          )}
          {res.triage && (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>Triage record</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                decision: {res.triage.decision}
                {res.triage.estimateHours != null && <> · {res.triage.estimateHours}h estimate</>}
                {res.triage.riskFlags?.length ? (
                  <> · risks: {res.triage.riskFlags.join(', ')}</>
                ) : null}
              </p>
            </>
          )}
        </section>
        <TriagePanel apiUrl={API_URL} email={email} briefId={id} status={res.status} />
      </div>
    </main>
  );
}
