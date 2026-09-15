import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';
import { PublicNav, PublicFooter } from './components/PublicChrome';

export const metadata = {
  title: 'Palette Canvas Workspace — the production operating system',
  description:
    'Intake to handover in one system. Capacity you can see, briefs to deliverables, one accountable pipeline for white-label creative delivery.',
};

/**
 * Landing page (spec §8.2). Section order matches the spec exactly: header,
 * hero slider, information cards, how-it-works showcase, footer.
 *
 * The hero slides and the card set are the spec's own list, not generic
 * marketing copy — each names a capability that exists in the product.
 */

/** §8.2.2 — hero slider, rotating the platform's real differentiators. */
const heroSlides = [
  {
    eyebrow: 'The production operating system',
    title: 'Intake to handover. One system.',
    body: 'Built for white-label, not bolted onto it. Capacity you can actually see, briefs to deliverables, one accountable pipeline.',
    cta: { label: 'See how it works', href: '#how-it-works' },
  },
  {
    eyebrow: 'Capacity & delivery',
    title: 'Capacity you can actually see.',
    body: 'Seat utilisation, workload and risk tracked against the real productive ceiling, before anyone commits to the work.',
    cta: { label: 'How capacity works', href: '#product' },
  },
  {
    eyebrow: 'White-label by design',
    title: 'Built for white-label, not bolted onto it.',
    body: 'Engagement boundaries, internal-only channels and pre-delivery compliance checks are part of the architecture.',
    cta: { label: 'Explore the platform', href: '#product' },
  },
];

/** §8.2.3 — one card per core capability named in the spec. */
const productCards = [
  {
    tag: 'Boards & views',
    href: '/dashboard',
    body: 'Kanban, Gantt, Calendar, Workload, Chart and Gallery over one data model — six ways to see the same work.',
  },
  {
    tag: 'Dashboards',
    href: '/reports',
    body: 'Exec-level rollups across every engagement, computed from the same numbers your team logs as they work.',
  },
  {
    tag: 'Communication',
    href: '/messages',
    body: 'Instant and threaded messaging, item comments, and self-hosted meetings, with internal-only channels enforced at the database.',
  },
  {
    tag: 'AI agents',
    href: '/agents',
    body: 'Brief analysis, KPI reminders and research — proposing, never deciding. Human approval stays the gate.',
  },
  {
    tag: 'Compliance',
    href: '/agents',
    body: 'White-label Compliance Guard runs pre-delivery metadata and attribution checks, and blocks release when they fail.',
  },
  {
    tag: 'Integrations',
    href: '/resources',
    body: 'Adobe, Canva and Dropbox connections so assets arrive in the workspace instead of being re-keyed by hand.',
  },
];

/**
 * §8.2.4 — the platform's own pipeline, used as the explainer.
 */
const pipelineSteps = [
  { step: 'Brief intake', body: 'Briefs land in a shared inbox and are triaged against capacity before anyone commits.' },
  { step: 'Production', body: 'Boards, columns and views shape the work; workload and risk stay visible while it moves.' },
  { step: 'QA gate', body: 'Version chains, compliance checks and client decisions accumulate as an auditable record.' },
  { step: 'Handover', body: 'Approved versions assemble into a handover pack, with retention and legal holds respected.' },
];

/**
 * §8.3 — two roles can request access; Guest has no sign-up path by design, so
 * it is described as a boundary rather than offered as a third route.
 */
const signupPaths = [
  {
    title: "I'm joining a Palette Canvas team",
    body: 'Employee, Account Manager or Management. Provisioned internally — this path collects a request, not an instant account.',
    href: '/signup',
  },
  {
    title: "I'm a Partner Agency",
    body: 'A self-serve request tied to an active or pending engagement, verified against that engagement before activation.',
    href: '/signup',
  },
];

export default function LandingPage() {
  const slides = heroSlides[0];

  return (
    <>
      <PublicNav />
      <main>
        <section style={{ textAlign: 'center', padding: 'clamp(56px, 9vw, 96px) clamp(16px, 4vw, 48px) clamp(40px, 6vw, 64px)' }}>
          <p
            style={{
              fontFamily: 'var(--mono)',
              color: brandRamp.accent,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 18px',
            }}
          >
            — {slides.eyebrow}
          </p>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(32px, 5.4vw, 52px)',
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--ink)',
              maxWidth: 820,
              margin: '0 auto 20px',
            }}
          >
            {slides.title}
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16, maxWidth: 580, margin: '0 auto 32px', lineHeight: 1.6 }}>{slides.body}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={slides.cta.href}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: brandRamp.accent,
                color: '#131021',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {slides.cta.label}
            </Link>
            <Link
              href="/signup"
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Two ways in
            </Link>
          </div>
          {/* Slider affordance: three real slides, first active. */}
          <div aria-hidden style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 46 }}>
            {heroSlides.map((s, i) => (
              <span
                key={s.title}
                style={{
                  width: i === 0 ? 22 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: i === 0 ? brandRamp.accent : 'var(--line-strong)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        </section>

        <section id="product" style={{ padding: '0 clamp(16px, 4vw, 48px) clamp(48px, 7vw, 80px)', maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 28px', textAlign: 'center' }}>
            One platform, every surface of the work
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            {productCards.map((c) => (
              <Link
                key={c.tag}
                href={c.href}
                style={{
                  background: brandRamp.raise,
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 26,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', color: brandRamp.violet, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {c.tag}
                </span>
                <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, lineHeight: 1.6, margin: '12px 0 0' }}>{c.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="how-it-works" style={{ background: 'var(--paper-deep)', padding: 'clamp(40px, 6vw, 60px) clamp(16px, 4vw, 48px)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 36px' }}>How it works</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 0, maxWidth: 1100, margin: '0 auto' }}>
            {pipelineSteps.map((s, i) => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'left', maxWidth: 210, padding: '0 8px' }}>
                  <div
                    style={{
                      border: '1px solid var(--line-strong)',
                      borderRadius: 9,
                      padding: '12px 16px',
                      color: 'var(--ink)',
                      fontSize: 12.5,
                      fontFamily: 'var(--mono)',
                      marginBottom: 10,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.step}
                  </div>
                  <p style={{ color: 'var(--ink-faint)', fontSize: 12, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <span aria-hidden style={{ color: brandRamp.accent, fontSize: 18, padding: '0 6px' }}>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="two-ways-in" style={{ padding: 'clamp(48px, 7vw, 72px) clamp(16px, 4vw, 48px)', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 10px', textAlign: 'center' }}>
            Two ways in
          </h2>
          <p style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', margin: '0 auto 32px', maxWidth: 560 }}>
            Accounts are provisioned against the same role model that governs the workspace. Guest access is the one tier with no
            self-serve path — links are generated by an Account or Production Manager and expire on their own.
          </p>
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {signupPaths.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                style={{ background: brandRamp.raise, border: '1px solid var(--line)', borderRadius: 12, padding: 24, textDecoration: 'none', display: 'block' }}
              >
                <h3 style={{ fontFamily: 'var(--display)', color: 'var(--ink)', fontSize: 15, margin: '0 0 8px' }}>{p.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}