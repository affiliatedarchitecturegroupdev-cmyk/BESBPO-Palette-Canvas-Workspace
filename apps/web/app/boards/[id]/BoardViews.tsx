'use client';
import { useState } from 'react';
import type { V2Column, V2Group, V2Item, V2Subitem, V2Timeline } from '@/lib/api';
import KanbanView from './KanbanView';
import TimelineView from './TimelineView';

/**
 * Board view switcher (§9.5). Kanban and timeline read the same items; the
 * difference is the axis, so switching never refetches or loses state that the
 * server already resolved.
 *
 * The timeline tab only appears when the server produced a timeline payload,
 * which itself only happens when a gantt/calendar view exists with a valid
 * `date_column_id`. Offering a tab that would 400 on click is worse than not
 * offering it.
 */
export default function BoardViews({
  apiUrl,
  email,
  columns,
  groups,
  items,
  subtasks,
  timeline,
  canWrite,
}: {
  apiUrl: string;
  email: string;
  columns: V2Column[];
  groups: V2Group[];
  items: V2Item[];
  subtasks: Record<string, V2Subitem[]>;
  timeline: V2Timeline | null;
  canWrite: boolean;
}) {
  const [view, setView] = useState<'kanban' | 'timeline'>('kanban');

  const tabs: Array<{ id: 'kanban' | 'timeline'; label: string }> = [
    { id: 'kanban', label: 'Kanban' },
    ...(timeline ? [{ id: 'timeline' as const, label: 'Timeline' }] : []),
  ];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {tabs.length > 1 && (
        <div role="tablist" style={{ display: 'flex', gap: 6 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                borderRadius: 999,
                border: `1px solid ${view === t.id ? 'var(--accent)' : 'var(--line)'}`,
                background: view === t.id ? 'var(--accent-soft)' : 'transparent',
                color: view === t.id ? 'var(--ink)' : 'var(--ink-dim)',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {view === 'kanban' ? (
        <KanbanView
          apiUrl={apiUrl}
          email={email}
          columns={columns}
          groups={groups}
          items={items}
          subtasks={subtasks}
          canWrite={canWrite}
        />
      ) : (
        timeline && <TimelineView data={timeline} />
      )}
    </div>
  );
}