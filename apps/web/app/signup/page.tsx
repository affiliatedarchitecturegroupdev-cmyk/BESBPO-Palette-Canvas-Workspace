import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';
import { PublicNav, PublicFooter } from '../components/PublicChrome';

export const metadata = { title: 'Get started — Palette Canvas' };

/**
 * Sign-up branching (spec §8.3). Three audiences, three paths — and explicitly
 * no guest self-serve: clients and third parties arrive through an invitation.
 */
const PATHS = [
  {
    id: 'employee',
    audience: 'Employee',
    title: 'Request an account',
    body: 'Your organisation already has a workspace. Ask your production lead or operations director to add you; access follows the role you are given.',
    action: 'Contact your workspace admin',
    href: '/help',
    tone: brandRamp.cobalt,
  },
  {
    id: 'agency',
    audience: 'Partner agency',
    title: 'Apply for a workspace',
    body: 'Bring your own delivery team onto the platform. We set up the workspace, agree the commercial terms, and invite your first people.',
    action: 'Start an application',
    href: '/help',
    tone: brandRamp.violet,
  },
  {
    id: 'guest',
    audience: 'Client or third party',
    title: 'You will be invited',
    body: 'There is no self-serve route for external access, and that is deliberate. You reach work through an invitation that is scoped to the item or engagement involved, and it expires.',
    action: 'Waiting on an invitation?',
    href: '/help',
    tone: brandRamp.magenta,
  },
];

export default function SignupPage() {
  return (
    <>
      <PublicNav />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Get started</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4.5vw, 44px)', margin: '10px 0 12px' }}>
          Which best describes you?
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.7, maxWidth: 640, margin: 0 }}>
          Access to a workspace is issued, not claimed. Pick the path that matches you and we will take it from there.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 36 }}>
          {PATHS.map((p) => (
            <article key={p.id} style={{ ...panelCard, borderColor: p.id === 'guest' ? 'var(--line-strong)' : 'var(--line)' }}>
              <span style={{ color: p.tone, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.audience}</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: '10px 0 8px' }}>{p.title}</h2>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>{p.body}</p>
              <Link href={p.href} style={{ color: p.tone, fontSize: 13, textDecoration: 'none', marginTop: 14 }}>
                {p.action} →
              </Link>
            </article>
          ))}
        </div>

        <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 32, maxWidth: 640, lineHeight: 1.6 }}>
          By requesting access you confirm you have read the{' '}
          <Link href="/legal/terms" style={{ color: 'var(--ink-dim)' }}>terms of service</Link> and the{' '}
          <Link href="/legal/privacy" style={{ color: 'var(--ink-dim)' }}>privacy notice</Link>.
        </p>
      </main>
      <PublicFooter />
    </>
  );
}

const panelCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 22,
  borderRadius: 16,
  border: '1px solid var(--line)',
  background: 'var(--brand-raise)',
};