/**
 * Scalable navigation model for the Palette Canvas AppShell.
 *
 * Nav is grouped by workspace activity. Each item can be shown/hidden by
 * capability (driven by `Me.roles` via `can()`), which keeps the nav growing
 * with the product without overwhelming any one role.
 */

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  capability?: string;
  badge?: 'notifications';
  exact?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operate',
    title: 'Operate',
    items: [
      { href: '/dashboard', label: 'Overview', shortLabel: 'Home', exact: true },
      { href: '/intake', label: 'Intake inbox', capability: 'intake.read' },
      { href: '/projects', label: 'Projects', capability: 'projects.read' },
      { href: '/boards', label: 'Boards', capability: 'boards.read' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/workload', label: 'Workload', capability: 'workload.read' },
      { href: '/templates', label: 'Templates', capability: 'templates.read' },
    ],
  },
  {
    id: 'plan',
    title: 'Capacity & delivery',
    items: [
      { href: '/capacity', label: 'Capacity', capability: 'capacity.read' },
      { href: '/reports', label: 'Reports', capability: 'reports.read' },
      { href: '/commercial', label: 'Commercial', capability: 'commercial.read' },
    ],
  },
  {
    id: 'connect',
    title: 'Connect',
    items: [
      { href: '/directory', label: 'Directory', capability: 'directory.read' },
      { href: '/notifications', label: 'Inbox', badge: 'notifications', capability: 'notifications.read' },
      { href: '/integrations', label: 'Integrations', capability: 'integrations.read' },
    ],
  },
  {
    id: 'govern',
    title: 'Govern',
    items: [
      { href: '/account-health', label: 'Account health', capability: 'reports.read' },
      { href: '/audit', label: 'Audit explorer', capability: 'audit.read' },
      { href: '/library', label: 'Library' },
      { href: '/settings/sso', label: 'SSO', capability: 'identity.sso.read' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      { href: '/settings', label: 'Settings' },
      { href: '/help', label: 'Help & shortcuts' },
    ],
  },
];

/** Flat list used for mobile quick-nav and active-route detection. */
export const ALL_NAV_ITEMS: (NavItem & { section: string })[] = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.id })),
);

/** Section ordering for layout rendering. */
export const NAV_SECTION_ORDER = NAV_SECTIONS.map((s) => s.id);

/** Whether a nav item is "active" for the given pathname. */
export function isNavActive(item: Pick<NavItem, 'href' | 'exact'>, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

/** Capability-based visibility: undefined capability means always visible. */
export function visibleNavItem(item: NavItem, has: (cap: string) => boolean): boolean {
  return item.capability ? has(item.capability) : true;
}

/**
 * Public-surface routes render without the application chrome (spec §8, §15).
 * Kept here so the shell and any future landing-page routing agree on one list.
 */
export const PUBLIC_PATHS = ['/', '/legal', '/resources', '/signup'] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some((p) => p !== '/' && pathname.startsWith(p));
}