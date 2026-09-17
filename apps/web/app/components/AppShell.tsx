'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_CAPABILITIES, Role } from '@palette-canvas/shared';
import { isNavActive, isPublicPath, NAV_SECTIONS, visibleNavItem } from './nav';
import GlobalSearch from './GlobalSearch';

/**
 * AppShell — responsive application chrome for Palette Canvas.
 *
 * Desktop: fixed sidebar (collapsible to icon rail) + top bar.
 * Mobile: top bar with hamburger + slide-in drawer + bottom quick-nav.
 *
 * Nav items are role-aware: sections collapse when the current role lacks
 * every capability in them, so the shell scales with the product.
 */

const BRAND_MARK = '◪';
const TOOLBAR_ITEMS = ['/dashboard', '/projects', '/intake', '/notifications'];

export default function AppShell({
  email,
  roles,
  unread,
  users,
  children,
}: {
  email: string | null;
  roles?: string[];
  unread: number;
  users: { email: string; name: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const prefersWide = useMemo(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true), []);

  // Scroll shadow on the topbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on route change
  useEffect(() => setMenuOpen(false), [pathname]);

  // Close the picker on outside click / Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPickerOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [pickerOpen]);

  const initial = email ? email.slice(0, 1).toUpperCase() : '?';
  const identityName = email?.split('@')[0] ?? 'guest';

  // Which capabilities does this role-set unlock? Empty roles => everything
  // (matches the API behaviour where no safe-default means show all).
  const roster = (roles?.length ? roles : Object.values(Role)) as Role[];
  const has = useMemo(() => { const caps = roster.flatMap((r) => ROLE_CAPABILITIES[r] ?? []); return (cap: string) => caps.includes(cap as never); }, [roster]);

  const activeSections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => visibleNavItem(i, has)),
  }));
  const navItems = activeSections.flatMap((s) => s.items);

  const toolbar = navItems.filter((i) => TOOLBAR_ITEMS.includes(i.href));
  const activeToolbar = toolbar.find((i) => isNavActive(i, pathname));
  const asideWidth = collapsed ? 76 : 264;

  // The public surface (spec §8, §15) is deliberately outside the app chrome:
  // a visitor who has never signed in should not see a navigation shell.
  if (isPublicPath(pathname)) {
    return <div style={{ minHeight: '100vh', background: 'var(--brand-deep)' }}>{children}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--brand-deep)' }}>
      {/* ══ Top bar ══ */}
      <header
        className="atelier-bg"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: 'var(--app-header-h)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: '1px solid var(--line)',
          transition: 'box-shadow 180ms ease',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        }}
      >
        {/* Mobile menu trigger */}
        <button
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          style={iconButton}
        >
          <MenuIcon />
        </button>

        {/* Sidebar collapse trigger (desktop) */}
        <button
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed((c) => !c)}
          style={{ ...iconButton, display: 'none' }}
          className="pc-collapse-btn"
        >
          <span style={{ fontSize: 13, letterSpacing: -1 }}>◀</span>
        </button>

        {/* Brand mark */}
        <Link
          href="/dashboard"
          aria-label="Palette Canvas home"
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', textDecoration: 'none' }}
        >
          <span
            aria-hidden
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(79,125,255,0.6)',
            }}
          >
            {BRAND_MARK}
          </span>
          <span
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.14em',
            }}
          >
            PALETTE&nbsp;CANVAS
          </span>
        </Link>

        {/* Desktop primary nav (top-level) */}
        <nav aria-label="Primary" style={{ display: 'flex', gap: 4, marginLeft: 24 }}>
          {navItems.slice(0, 4).map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  color: active ? 'var(--accent)' : 'var(--ink-dim)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                {item.label}
                {item.href === '/notifications' && unread > 0 && <UnreadPill count={unread} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <GlobalSearch email={email} />
          {/* Notification bell (mobile fallback) */}
          <Link href="/notifications" aria-label="Inbox" style={{ display: 'none', color: 'var(--ink-dim)' }} className="pc-bell">
            <BellIcon />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--flare)',
                  color: '#fff',
                  fontSize: 9,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  padding: '0 4px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {unread}
              </span>
            )}
          </Link>

          {/* Identity / user switcher (dev-mode: cookie-based) */}
          <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              aria-label="Switch user"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 10px 5px 5px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--line)',
                background: 'var(--brand-raise)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--flare))',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {initial}
              </span>
              <span style={{ fontSize: 12.5, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {identityName}
              </span>
              <span aria-hidden style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
            </button>
            {pickerOpen && (
              <div
                role="listbox"
                aria-label="Workspace users"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  minWidth: 220,
                  background: 'var(--brand-raise2)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: 6,
                  zIndex: 60,
                  animation: 'pc-scale-in 160ms ease both',
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                  Workspace identity
                </div>
                <UserRow current={email} />
                {users.map((u) => (
                  <UserRow key={u.email} user={u} current={email} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ Body: sidebar + content ══ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Desktop sidebar */}
        <aside
          className="pc-sidebar"
          style={{
            position: 'sticky',
            top: 'var(--app-header-h)',
            height: 'calc(100vh - var(--app-header-h))',
            width: asideWidth,
            flexShrink: 0,
            background: 'var(--brand-base)',
            borderRight: '1px solid var(--line)',
            transition: 'width 200ms ease',
            overflowY: 'auto',
            padding: '16px 10px',
            zIndex: 30,
          }}
        >
          {activeSections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.id} style={{ marginBottom: 18 }}>
                {!collapsed && (
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-subtle)',
                      padding: '0 10px',
                      marginBottom: 6,
                    }}
                  >
                    {section.title}
                  </div>
                )}
                <nav aria-label={section.title} style={{ display: 'grid', gap: 2 }}>
                  {section.items.map((item) => {
                    const active = isNavActive(item, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: collapsed ? '10px 0' : '8px 10px',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          fontWeight: 500,
                          color: active ? 'var(--ink)' : 'var(--ink-faint)',
                          background: active ? 'linear-gradient(90deg, var(--accent-soft), transparent)' : 'transparent',
                          borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                        }}
                      >
                        {!collapsed && <span style={{ fontSize: 12, width: 14, textAlign: 'center', opacity: 0.7 }}>{iconFor(item.href)}</span>}
                        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                        {!collapsed && item.href === '/notifications' && unread > 0 && <UnreadPill count={unread} />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ),
          )}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, padding: 'clamp(16px, 3vw, 40px)', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* ══ Mobile drawer ══ */}
      <div
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          background: 'rgba(8, 6, 16, 0.6)',
          backdropFilter: 'blur(2px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
        }}
      />
      <nav
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'min(320px, 86vw)',
          background: 'var(--brand-base)',
          zIndex: 80,
          transform: menuOpen ? 'translateX(0)' : 'translateX(-102%)',
          transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, letterSpacing: '0.14em', fontSize: 14 }}>PALETTE CANVAS</span>
          <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} style={iconButton}>
            <CloseIcon />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 12px 120px', flex: 1 }}>
          {activeSections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.id} style={{ margin: '14px 4px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-subtle)', padding: '0 8px', marginBottom: 6 }}>
                  {section.title}
                </div>
                <div style={{ display: 'grid', gap: 2 }}>
                  {section.items.map((item) => {
                    const active = isNavActive(item, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '11px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 15,
                          fontWeight: active ? 700 : 500,
                          color: active ? 'var(--accent)' : 'var(--ink-dim)',
                          background: active ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        <span aria-hidden style={{ fontSize: 14, width: 18, textAlign: 'center', opacity: 0.8 }}>{iconFor(item.href)}</span>
                        {item.label}
                        {item.href === '/notifications' && unread > 0 && <UnreadPill count={unread} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      </nav>

      {/* ══ Mobile quick-nav bar ══ */}
      <nav
        aria-label="Quick navigation"
        className="pc-toolbar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          background: 'var(--brand-base)',
          borderTop: '1px solid var(--line)',
          padding: '4px 8px calc(4px + env(safe-area-inset-bottom))',
          gap: 2,
          backdropFilter: 'blur(8px)',
        }}
      >
        {toolbar.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              style={{
                flex: 1,
                display: 'grid',
                placeItems: 'center',
                gap: 2,
                padding: '6px 4px 4px',
                borderRadius: 'var(--radius-sm)',
                color: active ? 'var(--accent)' : 'var(--ink-faint)',
                fontSize: 10,
                letterSpacing: '0.02em',
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{iconFor(item.href)}</span>
              {item.shortLabel ?? item.label}
              {item.href === '/notifications' && unread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: '30%',
                    minWidth: 14,
                    height: 14,
                    background: 'var(--flare)',
                    color: '#fff',
                    fontSize: 8,
                    borderRadius: 999,
                    padding: '0 3px',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function UnreadPill({ count }: { count: number }) {
  return (
    <span
      style={{
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 999,
        background: 'var(--flare)',
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        display: 'inline-grid',
        placeItems: 'center',
        lineHeight: 1,
      }}
    >
      {count}
    </span>
  );
}

function iconFor(href: string): string {
  const map: Record<string, string> = {
    '/': '◈',
    '/intake': '✉',
    '/projects': '▤',
    '/calendar': '▦',
    '/workload': '⌁',
    '/templates': '◫',
    '/capacity': '◧',
    '/reports': '◰',
    '/commercial': '£',
    '/directory': '☰',
    '/comms': '◌',
    '/meetings': '◷',
    '/notifications': '◆',
    '/integrations': '⇄',
    '/account-health': '♥',
    '/audit': '⌕',
    '/library': '▤',
    '/settings': '⚙',
    '/settings/sso': '⚿',
    '/help': '?',
  };
  return map[href] ?? '•';
}

const iconButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-sm)',
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--ink-dim)',
  cursor: 'pointer',
  position: 'relative',
};

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function UserRow({ user, current }: { user?: { email: string; name: string }; current: string | null }) {
  const router = useRouter();
  const email = user?.email ?? '';
  const name = user?.name ?? '— choose user —';
  const isCurrent = current === email;
  return (
    <button
      role="option"
      aria-selected={isCurrent}
      onClick={() => {
        document.cookie = email
          ? `pc_user_email=${encodeURIComponent(email)}; path=/`
          : `pc_user_email=; path=/; expires=${new Date(0).toUTCString()}`;
        router.refresh();
      }}
      style={{
        display: 'flex',
        gap: 10,
        width: '100%',
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        border: 0,
        background: isCurrent ? 'var(--accent-soft)' : 'transparent',
        color: isCurrent ? 'var(--accent)' : 'var(--ink-dim)',
        fontSize: 12.5,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--brand-raise2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {email.slice(0, 1).toUpperCase() || '?'}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {isCurrent && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
    </button>
  );
}