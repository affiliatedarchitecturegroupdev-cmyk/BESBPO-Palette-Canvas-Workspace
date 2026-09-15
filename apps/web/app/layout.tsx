import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Manrope, Poppins } from 'next/font/google';
import { currentEmail, me, notifications, users } from '@/lib/api';
import AppShell from './components/AppShell';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-serif' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans' });
// Public-surface display face. Spec §8.1's mockups head with Poppins; the
// workspace itself keeps Fraunces/Manrope, so this is additive.
const poppins = Poppins({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Palette Canvas Workspace',
  description: 'Role-aware production operating system for creative BPO delivery',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Force dynamic so the cookie is read per request
  const email = await currentEmail();
  const [meRes, userList, inboxRes] = await Promise.all([
    me(email),
    users(),
    email ? notifications(email) : Promise.resolve(null),
  ]);
  const identity = 'userId' in meRes ? meRes : null;
  const roles = identity?.roles ?? [];
  const unread = inboxRes && 'unread' in inboxRes ? inboxRes.unread : 0;
  const personList = Array.isArray(userList) ? userList : [];

  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable} ${manrope.variable} ${poppins.variable}`}>
      <body>
        <AppShell email={email} roles={roles} unread={unread} users={personList}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
