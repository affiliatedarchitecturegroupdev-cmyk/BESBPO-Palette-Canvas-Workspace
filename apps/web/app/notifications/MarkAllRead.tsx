'use client';
import { useRouter } from 'next/navigation';

/** "Mark all read" call for the notification inbox. */
export default function MarkAllRead({
  apiUrl,
  email,
  unreadIds,
}: {
  apiUrl: string;
  email: string;
  unreadIds: string[];
}) {
  const router = useRouter();
  async function markAll() {
    await fetch(`${apiUrl}/notifications/mark-read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify({ ids: unreadIds }),
    });
    router.refresh();
  }
  return (
    <button onClick={markAll} style={{ fontSize: 11, padding: '4px 10px' }}>
      mark all read
    </button>
  );
}
