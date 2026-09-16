'use client';
import { useMemo } from 'react';
import type { V2Timeline } from '@/lib/api';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Timeline/Gantt over the board's configured date column (§9.5).
 *
 * Swimlanes are board groups: each group is a horizontal band, and its items
 * are bars positioned by date. Bars are laid out on a shared absolute time
 * axis so the same date always sits at the same x across every lane — the
 * point of a timeline next to a kanban is comparing *when* things land.
 *
 * Items the API reports as unscheduled are listed under the chart rather than
 * dropped, so the view never looks emptier than the board actually is.
 */
export default function TimelineView({ data }: { data: V2Timeline }) {
  const layout = useMemo(() => {
    const times = data.bars.flatMap((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
    if (!times.length) return null;
    const min = Math.min(...times);
    const max = Math.max(...times);
    // A single-day board would give a zero-width axis and every bar would
    // divide by zero; pad the window so one date still reads as a bar.
    const span = Math.max(max - min, DAY_MS);
    return { min, span };
  }, [data.bars]);

  const lanes = useMemo(() => {
    const map = new Map<string, V2Timeline['bars']>();
    for (const g of data.groups) map.set(g.id, []);
    for (const b of data.bars) {
      if (!map.has(b.groupId)) map.set(b.groupId, []);
      map.get(b.groupId)!.push(b);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return [...map.entries()].map(([id, bars]) => ({
      id,
      name: data.groups.find((g) => g.id === id)?.name ?? 'Ungrouped',
      bars,
    }));
  }, [data]);

  const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  if (!layout) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
        No items on this board carry a value in <strong>{data.dateColumn.name}</strong> yet, so there is
        nothing to place on the timeline.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
        {data.view.name} · positioned by <strong>{data.dateColumn.name}</strong> ·{' '}
        {day(new Date(layout.min).toISOString())} → {day(new Date(layout.min + layout.span).toISOString())}
      </p>

      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {lanes.map((lane, i) => (
          <section
            key={lane.id}
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              background: i % 2 === 0 ? 'var(--brand-raise)' : 'transparent',
              padding: '10px 12px',
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 13.5, margin: 0 }}>
                {lane.name}
              </h3>
              <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{lane.bars.length}</span>
            </header>
            {lane.bars.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: 0 }}>no scheduled items</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 5 }}>
                {lane.bars.map((b) => {
                  const start = new Date(b.start).getTime();
                  const end = new Date(b.end).getTime();
                  const left = ((start - layout.min) / layout.span) * 100;
                  // One-day bars get a floor width so a point in time is still
                  // visible and clickable, rather than a zero-width sliver.
                  const width = Math.max(((end - start) / layout.span) * 100, 1.5);
                  return (
                    <li key={b.itemId} style={{ position: 'relative', height: 22 }}>
                      <span
                        title={`${b.name} — ${day(b.start)}${b.end !== b.start ? ` → ${day(b.end)}` : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${Math.min(left, 98)}%`,
                          width: `${width}%`,
                          top: 0,
                          height: 20,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-soft)',
                          border: '1px solid var(--accent)',
                          color: 'var(--ink)',
                          fontSize: 11,
                          lineHeight: '18px',
                          padding: '0 6px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {b.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      {data.unscheduled.length > 0 && (
        <section
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            background: 'var(--brand-raise)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 13, margin: '0 0 6px' }}>
            Not scheduled ({data.unscheduled.length})
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 3 }}>
            {data.unscheduled.map((u) => (
              <li key={u.id} style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
                {u.name} <span style={{ color: 'var(--ink-faint)' }}>· {u.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}