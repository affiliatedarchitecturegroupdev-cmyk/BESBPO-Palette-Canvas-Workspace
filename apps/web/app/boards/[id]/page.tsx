import Link from 'next/link';
import { Capability, can } from '@palette-canvas/shared';
import { boardDetail, currentEmail, me } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import { EmptyState, PageHeader } from '../../components/ui';
import KanbanView from './KanbanView';

/**
 * V2 board surface (§9). Kanban is the first view; the API already stores
 * groups, typed columns, and views, so list/timeline render off the same data
 * when they land. Moves are persisted through `POST /boards/items/:id/move`.
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
      <KanbanView
        apiUrl={BROWSER_API}
        email={email}
        columns={detailRes.columns}
        groups={detailRes.groups}
        items={detailRes.items}
        canWrite={canWrite}
      />
    </main>
  );
}