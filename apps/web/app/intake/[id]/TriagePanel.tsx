'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Triage + convert actions — Capability.IntakeTriage / IntakeConvert gated server-side. */
export default function TriagePanel({
  apiUrl,
  email,
  briefId,
  status,
}: {
  apiUrl: string;
  email: string;
  briefId: string;
  status: string;
}) {
  const router = useRouter();
  const [estimateHours, setEstimateHours] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const canConvert = status === 'qualified';

  async function post(path: string, body: object) {
    setError('');
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      setError(text || `HTTP ${res.status}`);
      return;
    }
    router.refresh();
  }

  async function triage(decision: 'qualified' | 'rejected' | 'needs_info') {
    await post(`/triage/${briefId}`, {
      decision,
      estimateHours: estimateHours ? Number(estimateHours) : undefined,
      capabilityOk: decision !== 'rejected',
      notes,
    });
  }

  const btn = (decision: 'qualified' | 'rejected' | 'needs_info', label: string) => (
    <button
      key={decision}
      onClick={() => triage(decision)}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        padding: '8px 14px',
        fontSize: 12,
        color: 'var(--ink)',
      }}
    >
      {label}
    </button>
  );

  return (
    <aside style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20, width: 280 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 18 }}>Triage</h2>
      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 12 }}>
        estimate (hours)
        <input
          value={estimateHours}
          onChange={(e) => setEstimateHours(e.target.value)}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </label>
      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 10 }}>
        notes
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {btn('qualified', 'qualify')}
        {btn('needs_info', 'needs info')}
        {btn('rejected', 'reject')}
      </div>
      {canConvert && (
        <button
          onClick={() => post('/projects/convert', { briefId })}
          style={{
            marginTop: 18,
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--paper)',
            border: 0,
            padding: '10px 0',
            fontSize: 12,
            letterSpacing: '0.1em',
          }}
        >
          CONVERT TO PROJECT
        </button>
      )}
      {error && <p style={{ color: 'var(--accent)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{error}</p>}
    </aside>
  );
}
