'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Subitem } from '@/lib/api';

/**
 * Subtasks nested under a parent item (§9.3). They live in `subitem`, not
 * `item`, so they carry their own small column set and never appear as
 * top-level board rows.
 *
 * The list is seeded from the parent's subtasks, which the board payload does
 * not carry — the page passes them in per item, and this component only owns
 * the add interaction on top.
 */
export default function SubtaskList({
  apiUrl,
  email,
  parentItemId,
  initial,
  canWrite,
}: {
  apiUrl: string;
  email: string;
  parentItemId: string;
  initial: V2Subitem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [subs, setSubs] = useState<V2Subitem[]>(initial);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError('');
    const res = await fetch(`${apiUrl}/boards/items/${parentItemId}/subitems`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `could not add subtask (${res.status})`);
      return;
    }
    setName('');
    const created = (await res.json()) as V2Subitem;
    setSubs((prev) => [...prev, created]);
    router.refresh();
  }

  return (
    <div
      // The card is draggable; without this, selecting text in the subtask
      // input starts a card drag instead of a text selection.
      onDragStart={(e) => e.preventDefault()}
      style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 7 }}
    >
      <span style={{ fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
        subtasks {subs.length > 0 ? `(${subs.length})` : ''}
      </span>
      {subs.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '5px 0 0', display: 'grid', gap: 3 }}>
          {subs.map((s) => (
            <li key={s.id} style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'flex', gap: 6 }}>
              <span aria-hidden style={{ color: 'var(--ink-faint)' }}>›</span>
              <span>{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={add} style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="add a subtask"
            aria-label={`Add a subtask to ${parentItemId}`}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              padding: '3px 7px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'var(--brand-base)',
              color: 'var(--ink)',
            }}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            style={{
              fontSize: 11.5,
              padding: '3px 9px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              background: 'var(--brand-raise2)',
              color: 'var(--ink)',
              cursor: busy || !name.trim() ? 'default' : 'pointer',
              opacity: busy || !name.trim() ? 0.55 : 1,
            }}
          >
            add
          </button>
        </form>
      )}
      {error && <p style={{ fontSize: 11, color: 'var(--danger)', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}