import Link from 'next/link';
import { Capability, can } from '@palette-canvas/shared';
import { boardDetail, currentEmail, me, subitems, timeline, type V2Subitem, type V2Timeline } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import { EmptyState, PageHeader } from '../../components/ui';
import BoardViews from './BoardViews';

/**
 * V2 board surface (§9). Kanban and timeline are two axes over the same items;
 * subtasks come from `subitem` and are nested under their parent card.
 *
 * Subtasks and the timeline are fetched only when there is something to fetch:
 * a board with no gantt/calendar view has no timeline payload, and the API
 * answers that with 404 — which is not an error worth surfacing.
 */
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const [detailRes, meRes] = await Promise.all([boardDetail(email, id), me(email)]);
  if ('error' in detailRes || !email) {
    return (
      <main>
        <Link href="/boards" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          ← boards
        </Link>
        <EmptyState
          title="Board unavailable"
          body="This board does not exist, sits outside your engagement, or your roles do not include board access."
        />
      </main>
    );
  }
  const roles = 'roles' in meRes ? meRes.roles : [];
  const canWrite = can(roles as Parameters<typeof can>[0], Capability.ItemsWrite);

  const subtaskPairs = await Promise.all(
    detailRes.items.map(async (it) => {
      const res = await subitems(email, it.id);
      return [it.id, 'error' in res ? [] : res] as const;
    }),
  );
  const subtasks: Record<string, V2Subitem[]> = Object.fromEntries(subtaskPairs);

  const tl = await timeline(email, id);
  const timelineData: V2Timeline | null = 'error' in tl ? null : tl;

  return (
    <main>
      <Link href="/boards" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        ← boards
      </Link>
      <PageHeader
        eyebrow={detailRes.board.is_template ? 'Template' : 'Board'}
        title={detailRes.board.name}
        subtitle={detailRes.board.description ?? 'Structured delivery board.'}
      />
      <BoardViews
        apiUrl={BROWSER_API}
        email={email}
        columns={detailRes.columns}
        groups={detailRes.groups}
        items={detailRes.items}
        subtasks={subtasks}
        timeline={timelineData}
        canWrite={canWrite}
      />
    </main>
  );
}