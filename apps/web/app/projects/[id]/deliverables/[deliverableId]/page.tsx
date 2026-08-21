import Link from 'next/link';
import { Capability, can } from '@palette-canvas/shared';
import { currentEmail, me, projectHome, deliverables, api } from '@/lib/api';
import { versions, qa, approvals, handover, changes, Version, Approval, QaItem } from '@/lib/api-proofing';
import { BROWSER_API } from '@/lib/config';
import ProofingView from './ProofingView';

/** Versions + QA + approval + handover for one deliverable (Phase 4). */
export default async function DeliverableProofingPage({ params }: { params: Promise<{ id: string; deliverableId: string }> }) {
  const { id, deliverableId } = await params;
  const email = await currentEmail();
  const proj = await projectHome(email, id);
  if ('error' in proj || !proj || !email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Project unavailable — check your access.</p>;
  }
  const dlList = await deliverables(email, id);
  const dl = Array.isArray(dlList) ? dlList.find((d) => d.id === deliverableId) : null;
  if (!dl) return <p style={{ color: 'var(--ink-dim)' }}>Deliverable not in this project.</p>;

  const meRes = await me(email);
  const roles = 'roles' in meRes ? meRes.roles : [];
  const canWriteVersions = can(roles as Parameters<typeof can>[0], Capability.VersionsWrite);
  const canRequest = can(roles as Parameters<typeof can>[0], Capability.ApprovalsRequest);
  const canDecide = can(roles as Parameters<typeof can>[0], Capability.ApprovalsDecide);
  const canQa = can(roles as Parameters<typeof can>[0], Capability.QaWrite);
  const canChange = can(roles as Parameters<typeof can>[0], Capability.ChangeWrite);

  const versionRes = await versions(email, deliverableId);
  const vs = Array.isArray(versionRes) ? versionRes : [];

  const details: { v: Version; qa: QaItem[]; approvals: Approval[] }[] = await Promise.all(
    vs.map(async (v) => {
      const qaRes = await qa(email, v.id);
      const apRes = await approvals(email, v.id);
      return {
        v,
        qa: Array.isArray(qaRes) ? qaRes : [],
        approvals: Array.isArray(apRes) ? apRes : [],
      };
    }),
  );

  const [handRes, changeRes] = await Promise.all([
    handover(email, id),
    changes(email, id),
  ]);
  const pkg = handRes && 'title' in handRes ? handRes : null;
  const ch = Array.isArray(changeRes) ? changeRes : [];

  async function proposeChange(formData: FormData) {
    'use server';
    const title = String(formData.get('title') ?? '');
    const impact = String(formData.get('hours') ?? '');
    if (!title) return;
    await api<unknown>(`/proofing/projects/${id}/changes`, email, {
      method: 'POST',
      body: JSON.stringify({ title, impactHours: impact ? Number(impact) : undefined }),
    });
  }

  return (
    <main>
      <Link href={`/projects/${id}`} style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        ← project
      </Link>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: '4px 0' }}>{dl.name}</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
        proofing · approval · handover — the full lifecycle of this deliverable.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Versions</h2>
          <ProofingView
            apiUrl={BROWSER_API}
            email={email}
            deliverableId={deliverableId}
            projectId={id}
            versions={details}
            canWriteVersions={canWriteVersions}
            canQa={canQa}
            canRequest={canRequest}
            canDecide={canDecide}
            handoverId={pkg?.id ?? null}
            handoverItems={pkg?.items ?? []}
          />
        </div>
        <div>
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 16 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Handover package</h2>
            {pkg ? (
              <div>
                <p style={{ fontSize: 13, margin: '8px 0' }}>
                  <strong>{pkg.title}</strong> — {pkg.status}
                  {pkg.delivered_at ? ` · delivered ${new Date(pkg.delivered_at).toISOString().slice(0, 10)}` : ''}
                </p>
                <ul style={{ fontSize: 12, color: 'var(--ink-dim)', paddingLeft: 18 }}>
                  {pkg.items.map((it) => (
                    <li key={it.id}>
                      v{it.version} — {it.label}
                      {it.licence ? ` · ${it.licence}` : ''}
                      {it.source_included ? ' · src included' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>No package assembled yet for this project.</p>
            )}
          </div>

          <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 16, marginTop: 16 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Change requests</h2>
            <ul style={{ fontSize: 12, color: 'var(--ink-dim)', paddingLeft: 18 }}>
              {ch.map((c) => (
                <li key={c.id}>
                  <strong style={{ color: 'var(--ink)' }}>{c.title}</strong> — {c.status}
                  {c.impact_hours ? ` · ${c.impact_hours}h` : ''}
                  {c.impact_cost ? ` · ${(c.impact_cost / 100).toFixed(0)}` : ''}
                </li>
              ))}
              {ch.length === 0 && <li>No change requests yet.</li>}
            </ul>
            {canChange && (
              <form style={{ display: 'flex', gap: 6, marginTop: 10 }} action={proposeChange}>
                <input
                  name="title"
                  placeholder="change request title"
                  style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 12 }}
                />
                <input
                  name="hours"
                  placeholder="hours"
                  inputMode="numeric"
                  style={{ width: 70, padding: '5px 8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 12 }}
                />
                <button type="submit" style={{ padding: '5px 12px', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--paper)', cursor: 'pointer' }}>
                  propose
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
