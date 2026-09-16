'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { V2Item } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';

/**
 * Cross-board item search (§9). Debounced, and deliberately not filtering for
 * permission on the client: `GET /boards/search` is already scoped to the
 * caller's org and engagement, and a client-side filter would be the wrong
 * place to enforce visibility.
 */
export default function GlobalSearch({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<V2Item[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K opens; Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setItems(null);
      setError('');
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${BROWSER_API}/boards/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { 'x-user-email': email ?? '' },
          cache: 'no-store',
        });
        if (!res.ok) {
          setError(res.status === 403 ? 'search is not available for your role' : `search failed (${res.status})`);
          setItems([]);
          return;
        }
        setItems((await res.json()) as V2Item[]);
      } catch {
        setError('api unreachable');
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, email]);

  return (
    <>
      <button
        aria-label="Search work"
        onClick={() => setOpen(true)}
        className="pc-search-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'var(--brand-raise)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--ink-faint)',
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        <span aria-hidden>⌕</span>
        <span>Search work</span>
        <kbd style={{ fontSize: 10, opacity: 0.7 }}>⌘K</kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Search work"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 14, 0.6)',
            zIndex: 90,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(620px, 92vw)',
              height: 'fit-content',
              background: 'var(--brand-raise)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items by name or column value…"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid var(--line)',
                color: 'var(--ink)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: 8 }}>
              {loading && <p style={hint}>searching…</p>}
              {!loading && error && <p style={{ ...hint, color: 'var(--danger)' }}>{error}</p>}
              {!loading && !error && items === null && <p style={hint}>Type to search every board you can see.</p>}
              {!loading && !error && items?.length === 0 && <p style={hint}>No matches.</p>}
              {!loading &&
                items?.map((it) => (
                  <Link
                    key={it.id}
                    href={`/boards/${it.board_id}`}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'block',
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)',
                      fontSize: 13,
                    }}
                  >
                    {it.name}
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)' }}>
                      {it.engagement_id ? 'engagement board' : 'division board'}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--ink-faint)',
  padding: '10px 10px',
  margin: 0,
};