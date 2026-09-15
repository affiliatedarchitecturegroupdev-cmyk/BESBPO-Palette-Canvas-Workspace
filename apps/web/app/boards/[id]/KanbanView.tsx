'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Column, V2Group, V2Item } from '@/lib/api';

/**
 * Kanban view over V2 board data, with HTML5 drag-and-drop.
 *
 * The drop target decides the semantics: dropping on an item moves the dragged
 * item *before* it, dropping on a group's empty area appends to that group.
 * Ordering is recomputed optimistically from the same rule the server applies,
 * so a successful move does not visibly reshuffle.
 */
export default function KanbanView({
  apiUrl,
  email,
  columns,
  groups,
  items,
  canWrite,
}: {
  apiUrl: string;
  email: string;
  columns: V2Column[];
  groups: V2Group[];
  items: V2Item[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<V2Item[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ groupId: string; beforeItemId?: string } | null>(null);
  const [error, setError] = useState('');

  const statusColumn = useMemo(
    () => columns.find((c) => c.column_type === 'status' || c.column_type === 'dropdown'),
    [columns],
  );

  // Adopt a fresh server payload, which is what `router.refresh()` after a move
  // delivers. Without this the optimistic state would outlive the refresh and
  // mask anyone else's intervening change.
  useEffect(() => {
    setLocal(items);
  }, [items]);

  const byGroup = useMemo(() => {
    const map = new Map<string, V2Item[]>();
    for (const g of groups) map.set(g.id, []);
    for (const it of local) {
      if (!map.has(it.group_id)) map.set(it.group_id, []);
      map.get(it.group_id)!.push(it);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [groups, local]);

  async function move(itemId: string, groupId: string, beforeItemId?: string) {
    setError('');
    const previous = local;
    setLocal(applyMove(local, itemId, groupId, beforeItemId));
    const res = await fetch(`${apiUrl}/boards/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify({ groupId, beforeItemId }),
    });
    if (!res.ok) {
      // Roll back to the last server-confirmed order rather than leaving the
      // board showing a move the API rejected.
      setLocal(previous);
      setError((await res.text()) || `move failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  function labelFor(item: V2Item): string | null {
    if (!statusColumn) return null;
    const raw = item.column_values?.[statusColumn.id];
    if (raw === undefined || raw === null || raw === '') return null;
    const labels = (statusColumn.config as { labels?: Array<{ id: string; text: string }> }).labels ?? [];
    const match = labels.find((l) => l.id === raw);
    return match?.text ?? String(raw);
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {!canWrite && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: 0 }}>
          You can read this board. Moving items requires the items.write capability.
        </p>
      )}
      {error && <p style={{ fontSize: 12.5, color: 'var(--danger)', margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
        {groups.map((g) => {
          const list = byGroup.get(g.id) ?? [];
          const groupOver = over?.groupId === g.id && !over.beforeItemId;
          return (
            <section
              key={g.id}
              onDragOver={(e) => {
                if (!canWrite || !dragId) return;
                e.preventDefault();
                setOver({ groupId: g.id });
              }}
              onDrop={(e) => {
                if (!canWrite || !dragId) return;
                e.preventDefault();
                void move(dragId, g.id, over?.beforeItemId);
                setDragId(null);
                setOver(null);
              }}
              style={{
                flex: '1 0 260px',
                minWidth: 260,
                border: `1px solid ${groupOver ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-raise)',
                padding: 12,
              }}
            >
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 14.5, margin: 0 }}>{g.name}</h2>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{list.length}</span>
              </header>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, minHeight: 24 }}>
                {list.map((it) => {
                  const label = labelFor(it);
                  const isOver = over?.groupId === g.id && over.beforeItemId === it.id;
                  return (
                    <li
                      key={it.id}
                      draggable={canWrite}
                      onDragStart={() => setDragId(it.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onDragOver={(e) => {
                        if (!canWrite || !dragId || dragId === it.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setOver({ groupId: g.id, beforeItemId: it.id });
                      }}
                      onDrop={(e) => {
                        if (!canWrite || !dragId || dragId === it.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                        void move(dragId, g.id, it.id);
                        setDragId(null);
                        setOver(null);
                      }}
                      style={{
                        cursor: canWrite ? 'grab' : 'default',
                        padding: '9px 11px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--brand-base)',
                        border: `1px solid ${isOver ? 'var(--accent)' : 'var(--line)'}`,
                        opacity: dragId === it.id ? 0.5 : 1,
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{it.name}</span>
                      {label && (
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 5,
                            fontSize: 11,
                            padding: '1px 7px',
                            borderRadius: 999,
                            border: '1px solid var(--line)',
                            color: 'var(--ink-dim)',
                          }}
                        >
                          {label}
                        </span>
                      )}
                    </li>
                  );
                })}
                {list.length === 0 && (
                  <li style={{ fontSize: 11.5, color: 'var(--ink-faint)', listStyle: 'none' }}>drop items here</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Mirror of the server's ordering rule, used for the optimistic update. */
export function applyMove(
  items: V2Item[],
  itemId: string,
  groupId: string,
  beforeItemId?: string,
): V2Item[] {
  const moving = items.find((i) => i.id === itemId);
  if (!moving) return items;
  const rest = items.filter((i) => i.id !== itemId);
  const destination = rest
    .filter((i) => i.group_id === groupId)
    .sort((a, b) => a.position - b.position);
  const index = beforeItemId ? destination.findIndex((i) => i.id === beforeItemId) : destination.length;
  const at = index < 0 ? destination.length : index;

  const reordered = [
    ...destination.slice(0, at),
    { ...moving, group_id: groupId },
    ...destination.slice(at),
  ].map((i, pos) => ({ ...i, position: pos }));

  const others = rest.filter((i) => i.group_id !== groupId);
  return [...others, ...reordered];
}