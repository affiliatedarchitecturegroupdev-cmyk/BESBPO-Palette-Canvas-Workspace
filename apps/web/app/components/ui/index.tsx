import Link from 'next/link';
import type { ReactNode } from 'react';
import { STATUS_TONE } from '@palette-canvas/design-tokens';

/* ------------------------------------------------------------------ */
/* Design-system primitives — server-safe (no hooks)                    */
/* ------------------------------------------------------------------ */

const tones: Record<string, string> = {
  accent: 'var(--accent)',
  flare: 'var(--flare)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  qualified: 'var(--status-qualified)',
  inProgress: 'var(--status-in-progress)',
  internalQa: 'var(--status-internal-qa)',
  proofing: 'var(--status-proofing)',
  changeControl: 'var(--status-change-control)',
  handover: 'var(--status-handover)',
  done: 'var(--status-done)',
  blocked: 'var(--status-blocked)',
  onTrack: 'var(--status-on-track)',
  atRisk: 'var(--status-at-risk)',
  overdue: 'var(--status-overdue)',
  inkFaint: 'var(--ink-faint)',
  inkDim: 'var(--ink-dim)',
};

export function toneFor(status: string): string {
  const key = STATUS_TONE?.[status] ?? 'inkFaint';
  return tones[key] ?? 'var(--ink-faint)';
}

/* Card — the atomic surface for Panels, StatCards, and lists. */
export function Card({
  children,
  style,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
  as?: 'div' | 'section' | 'article';
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={className}
      style={{
        background: 'var(--brand-raise)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* PageHeader — consistent page title + eyebrow + trailing actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {icon}
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 600,
            fontSize: 'clamp(24px, 3vw, 34px)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '6px 0 0', color: 'var(--ink-dim)', fontSize: 14, maxWidth: 560 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
    </header>
  );
}

/* Badge — status pills driven by the shared STATUS_TONE map. */
export function Badge({
  children,
  status,
  tone = 'inkFaint',
}: {
  children: ReactNode;
  status?: string;
  tone?: string;
}) {
  const resolved = status ? STATUS_TONE?.[status] ?? tone : tone;
  const toneKey = (tones[resolved] ? resolved : 'inkFaint') as keyof typeof tones;
  const fg = tones[toneKey];
  const soft = `${fg}24`;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: soft,
        color: fg,
        fontSize: 11,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${fg}33`,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <StatusDot tone={toneKey} size={6} />
      {children}
    </span>
  );
}

export function StatusDot({ tone, size = 8 }: { tone: string; size?: number }) {
  const fg = tones[tone] ?? 'var(--ink-faint)';
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: fg,
        boxShadow: `0 0 0 3px ${fg}22`,
        flexShrink: 0,
      }}
    />
  );
}

/* Row-level readability: preserves sourcing from status values. */
export function toneName(status: string): string {
  return STATUS_TONE?.[status] ?? 'inkFaint';
}

/* Button — primary / secondary / ghost, as <button> or <Link>. */
export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  style,
  ...rest
}: {
  children: ReactNode;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & { onClick?: never }) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--sans)',
    fontWeight: 600,
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 12 : 13.5,
    padding:
      size === 'lg' ? '12px 22px' : size === 'sm' ? '6px 12px' : '9px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'background 150ms ease, border-color 150ms ease, transform 80ms ease',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ...style,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff' },
    secondary: { background: 'var(--brand-raise2)', color: 'var(--ink)', borderColor: 'var(--line-strong)' },
    ghost: { background: 'transparent', color: 'var(--ink-dim)', borderColor: 'transparent' },
    danger: { background: 'var(--danger)', color: '#fff' },
  };
  const merged: React.CSSProperties = { ...base, ...variants[variant], ...style };
  if (href) {
    return (
      <Link href={href} style={merged}>
        {children}
      </Link>
    );
  }
  return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} style={merged}>{children}</button>;
}

/* DataTable — reactive, responsive table with consistent row styling.
 *
 * Kept as a server component (no event handlers) so it composes safely inside
 * the AppShell client boundary. Navigate via the page's own <Link> in render
 * cells instead of row-level click handlers.
 * Rows are keyed by `rowKey` (default: the row's `id`), falling back to the
 * row index so API rows without an `id` (e.g. person_id/status keys) are
 * fully supported. */
export function DataTable<T extends object>({
  columns,
  rows,
  empty,
  rowKey,
}: {
  columns: { key: string; header: ReactNode; render: (row: T) => ReactNode }[];
  rows: T[];
  empty?: ReactNode;
  rowKey?: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <Card style={{ padding: 32 }}>
        {empty ?? <p style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', margin: 0 }}>Nothing to show</p>}
      </Card>
    );
  }
  const keyFor = (row: T, index: number): string => {
    if (rowKey) return rowKey(row, index);
    return 'id' in row ? String((row as { id: unknown }).id) : String(index);
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13.5,
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: '6px 10px', borderBottom: '1px solid var(--line-strong)' }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={keyFor(row, i)} style={{ borderBottom: '1px solid var(--line)' }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: '11px 10px', color: 'var(--ink-dim)', verticalAlign: 'middle' }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* StatCard — KPI block used across dashboard surfaces. */
export function StatCard({
  label,
  value,
  detail,
  href,
  trend,
  accent,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
  trend?: 'up' | 'down' | 'flat' | 'warn';
  accent?: string;
}) {
  const trendColor =
    trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--flare)' : trend === 'warn' ? 'var(--warning)' : 'var(--ink-faint)';
  const inner = (
    <Card style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontFamily: 'var(--serif)', fontWeight: 600, color: accent ?? 'var(--ink)', lineHeight: 1.1 }}>
        {value}
      </div>
      {detail && (
        <div style={{ fontSize: 12.5, color: trendColor, display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
          {trend && <TrendArrow trend={trend} />}
          {detail}
        </div>
      )}
    </Card>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link> : inner;
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' | 'warn' }) {
  if (trend === 'flat') return <span aria-hidden>→</span>;
  if (trend === 'warn') return <span aria-hidden>!</span>;
  return <span aria-hidden>{trend === 'up' ? '↑' : '↓'}</span>;
}

/* EmptyState — used in panels and pages. */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card
      style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      {icon && <div style={{ fontSize: 28, opacity: 0.7 }}>{icon}</div>}
      <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 18 }}>{title}</h3>
      {body && <p style={{ margin: 0, color: 'var(--ink-faint)', fontSize: 13.5, maxWidth: 360 }}>{body}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </Card>
  );
}

/* Spinner / loading affordance. */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid var(--line-strong)`,
        borderTopColor: 'var(--accent)',
        animation: 'pc-spin 700ms linear infinite',
      }}
    />
  );
}

/* ProgressBar — thin filled track. */
export function ProgressBar({
  value,
  max = 100,
  tone = 'var(--accent)',
}: {
  value: number;
  max?: number;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'var(--brand-base)', overflow: 'hidden', width: '100%' }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: tone,
          borderRadius: 999,
          transition: 'width 400ms ease',
        }}
      />
    </div>
  );
}