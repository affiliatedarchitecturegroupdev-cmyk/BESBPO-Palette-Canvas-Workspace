import Link from 'next/link';
import { brandDots, brandRamp } from '@palette-canvas/design-tokens';

/**
 * Public surface chrome (spec §8.2). Deliberately separate from `AppShell`:
 * the landing page is a marketing surface, so it carries the wordmark, the
 * multi-dot brand mark and a footer rather than product navigation.
 */
export function PublicNav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px clamp(16px, 4vw, 48px)',
        background: 'rgba(19, 16, 33, 0.86)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)' }}>
        <BrandDots />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '0.01em' }}>Palette Canvas</span>
      </Link>
      <nav aria-label="Public" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 28px)' }}>
        <PublicLink href="/signup">Get started</PublicLink>
        <PublicLink href="/resources">Resources</PublicLink>
        <PublicLink href="/help">Help</PublicLink>
        <Link
          href="/notifications"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 999px)',
            background: brandRamp.gradient,
            color: '#0d0b19',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Open workspace
        </Link>
      </nav>
    </header>
  );
}

function PublicLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="pc-public-link" style={{ color: 'var(--ink-dim)', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      {children}
    </Link>
  );
}

/** Three-dot brand mark taken from the mockup (§8.1). */
export function BrandDots() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 3 }}>
      {brandDots.map((c) => (
        <span key={c} style={{ width: 7, height: 7, borderRadius: 999, background: c, display: 'inline-block' }} />
      ))}
    </span>
  );
}

export function PublicFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 64, padding: '40px clamp(16px, 4vw, 48px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
            <BrandDots />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>Palette Canvas</span>
          </div>
          <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 10, maxWidth: 320 }}>
            The production operating system for creative delivery — intake to handover.
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            ['Resources', '/resources'],
            ['Help centre', '/help'],
            ['Get started', '/signup'],
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            ['Terms of service', '/legal/terms'],
            ['Privacy notice', '/legal/privacy'],
            ['Accessibility', '/legal/accessibility'],
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            ['Contact', '/help'],
            ['Status', '/resources#status'],
          ]}
        />
      </div>
      <p style={{ color: 'var(--ink-subtle)', fontSize: 12, maxWidth: 1120, margin: '32px auto 0' }}>
        © {new Date().getFullYear()} Palette Canvas. Registered in the United Kingdom.
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div style={{ minWidth: 150 }}>
      <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-faint)', margin: '0 0 12px' }}>{title}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="pc-public-link" style={{ color: 'var(--ink-dim)', fontSize: 13, textDecoration: 'none' }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}