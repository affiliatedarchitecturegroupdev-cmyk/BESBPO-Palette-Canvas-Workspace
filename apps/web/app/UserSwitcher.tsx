'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { USER_COOKIE } from '@/lib/config';

/**
 * Dev user switcher: picks an identity cookie that server components forward
 * to the API as the auth header. Replaced by SSO in Phase 5 hardening.
 */
export default function UserSwitcher({
  emails,
  current,
}: {
  emails: string[];
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? '');

  useEffect(() => setValue(current ?? ''), [current]);

  return (
    <select
      aria-label="Switch user"
      value={value}
      onChange={(e) => {
        document.cookie = e.target.value
          ? `${USER_COOKIE}=${e.target.value}; path=/`
          : `${USER_COOKIE}=; path=/; expires=${new Date(0).toUTCString()}`;
        setValue(e.target.value);
        router.refresh();
      }}
      style={{
        background: 'var(--paper-raise)',
        color: 'var(--ink)',
        border: '1px solid var(--line)',
        padding: '4px 8px',
        fontSize: 12,
      }}
    >
      <option value="">— choose user —</option>
      {emails.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  );
}
