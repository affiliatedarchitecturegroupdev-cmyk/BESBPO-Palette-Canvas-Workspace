'use client';

import { useState } from 'react';
import type { Version, Approval, QaItem } from '@/lib/api-proofing';
import type { HandoverItem } from '@/lib/api-proofing';

interface SuperEntry {
  v: Version;
  qa: QaItem[];
  approvals: Approval[];
}

export default function ProofingView({
  apiUrl,
  email,
  deliverableId,
  projectId,
  versions,
  canWriteVersions,
  canQa,
  canRequest,
  canDecide,
  handoverId,
  handoverItems,
}: {
  apiUrl: string | undefined;
  email: string | null;
  deliverableId: string;
  projectId: string;
  versions: SuperEntry[];
  canWriteVersions: boolean;
  canQa: boolean;
  canRequest: boolean;
  canDecide: boolean;
  handoverId: string | null;
  handoverItems: HandoverItem[];
}) {
  const inHandover = new Set(handoverItems.map((i) => i.version_id));
  const call = async (path: string, body?: unknown, method = 'POST') => {
    await fetch(`${apiUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-user-email': email ?? '' },
      body: body ? JSON.stringify(body) : undefined,
    });
    location.reload();
  };

  const [label, setLabel] = useState('');
  const [uri, setUri] = useState('');
  const [qaLabel, setQaLabel] = useState<Record<string, string>>({});

  return (
    <div>
      {versions.map(({ v, qa, approvals }) => (
        <div key={v.id} style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 14, marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>v{v.version}</strong> — {v.label}
            <span style={{ color: 'var(--ink-faint)', marginLeft: 8 }}>
              {v.status}
              {inHandover.has(v.id) ? ' · in handover' : ''}
            </span>
          </p>
          <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--ink-dim)' }}>{v.uri}</p>

          {qa.length > 0 && (
            <ul style={{ fontSize: 12, color: 'var(--ink-dim)', paddingLeft: 18, margin: '6px 0' }}>
              {qa.map((q) => (
                <li key={q.id}>
                  {q.passed ? '✔' : '◻'} {q.kind}: {q.label}
                  {q.note ? ` — ${q.note}` : ''}
                  {canQa && !q.passed && (
                    <button
                      onClick={() => call(`/proofing/versions/${v.id}/qa/${q.id}`, { passed: true }, 'PATCH')}
                      style={{ marginLeft: 8, padding: '1px 8px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
                    >
                      pass
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {approvals.map((a) => (
            <p key={a.id} style={{ fontSize: 12, color: 'var(--ink-dim)', margin: '2px 0' }}>
              approval requested {a.requested_at.slice(0, 16)} — {a.decision ?? 'pending'}
              {a.decision_note ? ` · "${a.decision_note}"` : ''}
              {canDecide && !a.decision && (
                <span style={{ marginLeft: 8 }}>
                  <button
                    onClick={() => call(`/proofing/approvals/${a.id}/decide`, { decision: 'approved' })}
                    style={{ padding: '1px 10px', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
                  >
                    approve
                  </button>
                  <button
                    onClick={() => call(`/proofing/approvals/${a.id}/decide`, { decision: 'changes_requested', note: 'needs revision' })}
                    style={{ marginLeft: 4, padding: '1px 10px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontSize: 11, cursor: 'pointer' }}
                  >
                    request changes
                  </button>
                </span>
              )}
            </p>
          ))}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {canQa && (v.status === 'draft' || v.status === 'under_qa') && (
              <input
                value={qaLabel[v.id] ?? ''}
                onChange={(e) => setQaLabel((s) => ({ ...s, [v.id]: e.target.value }))}
                placeholder="add QA item"
                aria-label={`New QA item for version ${v.version}`}
                style={{ padding: '4px 8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 11 }}
              />
            )}
            {canQa && (v.status === 'draft' || v.status === 'under_qa') && (
              <button
                onClick={() => {
                  const label = qaLabel[v.id];
                  if (label) call(`/proofing/versions/${v.id}/qa`, { label, kind: 'technical' });
                }}
                style={{ padding: '4px 10px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
              >
                add QA
              </button>
            )}
            {canRequest && v.status === 'under_qa' && qa.length > 0 && qa.every((q) => q.passed) && (
              <button
                onClick={() => call(`/proofing/approvals/${v.id}`, { dueAt: undefined })}
                style={{ padding: '4px 12px', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
              >
                request client approval
              </button>
            )}
            {v.status === 'approved' && handoverId && !inHandover.has(v.id) && canWriteVersions && (
              <button
                onClick={() => call(`/proofing/handover/${handoverId}/items`, { versionId: v.id, licence: 'CC BY' })}
                style={{ padding: '4px 12px', border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 11, cursor: 'pointer' }}
              >
                add to handover
              </button>
            )}
          </div>
        </div>
      ))}
      {versions.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 10 }}>No versions yet.</p>}

      {canWriteVersions && (
        <div style={{ border: '1px dashed var(--line)', padding: 12, marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>new version</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="label"
              aria-label="New version label"
              style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 12 }}
            />
            <input
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="uri"
              aria-label="New version URI"
              style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 12 }}
            />
            <button
              onClick={() => {
                if (label && uri) call(`/proofing/versions/${deliverableId}`, { label, uri });
              }}
              style={{ padding: '5px 12px', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--paper)', cursor: 'pointer' }}
            >
              add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
