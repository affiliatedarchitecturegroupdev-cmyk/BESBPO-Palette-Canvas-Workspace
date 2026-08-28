import type { Metadata } from 'next';
import { currentEmail, me, notifications, users } from '@/lib/api';
import UserSwitcher from './UserSwitcher';
import './globals.css';

export const metadata: Metadata = {
  title: 'Palette Canvas Workspace',
  description: 'Role-aware production operating system for creative BPO delivery',
};

const links = [
  { href: '/', label: 'Home' },
  { href: '/intake', label: 'Intake' },
  { href: '/directory', label: 'Directory' },
  { href: '/templates', label: 'Templates' },
  { href: '/projects', label: 'Projects' },
  { href: '/workload', label: 'Workload' },
  { href: '/capacity', label: 'Capacity' },
  { href: '/reports', label: 'Reports' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/audit', label: 'Audit' },
  { href: '/account-health', label: 'Accounts' },
  { href: '/library', label: 'Library' },
  { href: '/settings/sso', label: 'SSO' },
  { href: '/notifications', label: 'Inbox' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Force dynamic so the cookie is read per request
  const email = await currentEmail();
  const [meRes, userList, inboxRes] = await Promise.all([
    me(email),
    users(),
    email ? notifications(email) : Promise.resolve(null),
  ]);
  const identity = 'userId' in meRes ? meRes : null;
  const unread = inboxRes && 'unread' in inboxRes ? inboxRes.unread : 0;

  return (
    <html lang="en">
      <body>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '12px 32px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper-raise)',
          }}
        >
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span
            style={{
              letterSpacing: '0.3em',
              fontSize: 11,
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              padding: '3px 8px',
            }}
          >
            PALETTE CANVAS
          </span>
          {links.map((l) => (
            <a key={l.href} href={l.href} style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              {l.label}
              {l.href === '/notifications' && unread > 0 && (
                <sup
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--paper)',
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                >
                  {unread}
                </sup>
              )}
            </a>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {identity && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                {identity.roles.join(', ')}
              </span>
            )}
            <UserSwitcher emails={userList.map((u) => u.email)} current={email} />
          </div>
          </nav>
        </header>
        <div style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }}>{children}</div>
      </body>
    </html>
  );
}
