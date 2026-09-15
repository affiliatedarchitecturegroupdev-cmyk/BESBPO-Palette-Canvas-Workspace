import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';

/**
 * Public surface chrome (spec §8.2). Deliberately separate from `AppShell`:
 * the landing page is a marketing surface, so it carries the real logo lockup
 * and the footer link structure the spec calls for, not product navigation.
 */

/**
 * The real logo lockup. The mark ships as an SVG asset from the specification
 * package rather than being redrawn in inline styles, so the gradient ramp
 * cannot drift from the supplied artwork.
 */
export function BrandLockup({ height = 26 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/palette-canvas-logo-horizontal.svg" alt="Palette Canvas" height={height} style={{ height, width: 'auto' }} />
  );
}

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
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <BrandLockup />
      </Link>
      <nav aria-label="Public" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 28px)' }}>
        <PublicLink href="/#product">Product</PublicLink>
        <PublicLink href="/#how-it-works">How it works</PublicLink>
        <PublicLink href="/resources">Resources</PublicLink>
        <PublicLink href="/#two-ways-in">Sign up</PublicLink>
        <Link
          href="/dashboard"
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
          Log in
        </Link>
      </nav>
    </header>
  );
}

function PublicLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="pc-public-link"
      style={{ color: 'var(--ink-dim)', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
    >
      {children}
    </Link>
  );
}

export function PublicFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 64, padding: '40px clamp(16px, 4vw, 48px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ minWidth: 220 }}>
          <BrandLockup height={22} />
          <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 12, maxWidth: 320 }}>
            The production operating system for creative delivery — intake to handover.
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            ['Boards & views', '/#product'],
            ['Dashboards', '/#product'],
            ['How it works', '/#how-it-works'],
          ]}
        />
        <FooterColumn
          title="Resources"
          links={[
            ["What's new", '/resources'],
            ['Help centre', '/help'],
            ['Get started', '/signup'],
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            ['Terms of service', '/legal/terms'],
            ['Privacy policy', '/legal/privacy'],
            ['Accessibility', '/legal/accessibility'],
          ]}
        />
        <FooterColumn title="Contact" links={[['agencies@palettecanvas.work', 'mailto:agencies@palettecanvas.work']]} />
      </div>
      <p style={{ color: 'var(--ink-subtle)', fontSize: 12, maxWidth: 1120, margin: '32px auto 0' }}>
        © {new Date().getFullYear()} Palette Canvas.
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div style={{ minWidth: 160 }}>
      <h2
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--ink-faint)',
          margin: '0 0 12px',
          fontFamily: 'var(--mono)',
        }}
      >
        {title}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="pc-public-link" style={{ color: 'var(--ink-dim)', fontSize: 13, textDecoration: 'none' }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}