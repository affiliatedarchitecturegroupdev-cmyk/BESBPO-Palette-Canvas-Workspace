import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';
import { PublicNav, PublicFooter, BrandDots } from './components/PublicChrome';

/**
 * Landing page (spec §8.2): header, hero with slider, info cards,
 * how-it-works, footer. Static content — no API calls, so it renders for a
 * signed-out visitor.
 */

const HERO_SLIDES = [
  {
    eyebrow: 'Creative BPO operations',
    title: 'Every campaign, every handover, one canvas.',
    body: 'Intake, triage, production, proofing and handover on a single role-aware surface — with an audit trail your clients can trust.',
    cta: { label: 'Get started', href: '/signup' },
  },
  {
    eyebrow: 'Capacity you can defend',
    title: 'Know the floor before you sell the work.',
    body: 'Seat-level utilisation against a productive-hours ceiling, so a commitment is a measurement rather than a guess.',
    cta: { label: 'See the model', href: '/resources' },
  },
  {
    eyebrow: 'Governed automation',
    title: 'Agents propose. People decide.',
    body: 'Six bounded agents assist with estimation, compliance and reminders — every run recorded, none of them holding the keys.',
    cta: { label: 'How it works', href: '/resources#agents' },
  },
];

const INFO_CARDS = [
  {
    title: 'One intake, no re-keying',
    body: 'A brief becomes a project with its boards, columns and team attached — the same records from first contact to final sign-off.',
    tag: 'Intake → project',
  },
  {
    title: 'Engagement boundaries built in',
    body: 'Clients and third parties see their own engagement and nothing else. Guests are scoped to a single item and expire by default.',
    tag: 'Access',
  },
  {
    title: 'Proof, not promises',
    body: 'Versions, approvals, QA checks and handover packs are recorded as they happen, so evidence is a by-product of the work.',
    tag: 'Delivery',
  },
  {
    title: 'Commercials in the same room',
    body: 'Rate cards, estimates, budget-versus-effort and invoice-ready lines sit beside the work they describe.',
    tag: 'Commercial',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Capture', body: 'Briefs land in a shared inbox and are triaged against capacity before anyone commits.' },
  { step: '02', title: 'Produce', body: 'Boards, columns and views shape the work; workload and risk stay visible while it moves.' },
  { step: '03', title: 'Prove', body: 'Version chains, QA gates and client decisions accumulate as an auditable record.' },
  { step: '04', title: 'Hand over', body: 'Approved versions assemble into a handover pack, with retention and legal holds respected.' },
];

const SOCIALS: [string, string][] = [
  ['LinkedIn', 'https://www.linkedin.com/'],
  ['X', 'https://x.com/'],
  ['Instagram', 'https://www.instagram.com/'],
];

export default function LandingPage() {
  const hero = HERO_SLIDES[0];
  return (
    <>
      <PublicNav />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)' }}>
        {/* Hero */}
        <section
          className="pc-fade-up"
          aria-labelledby="hero-title"
          style={{ padding: 'clamp(48px, 8vw, 96px) 0 clamp(32px, 5vw, 56px)', display: 'grid', gap: 20, maxWidth: 760 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--ink-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            <BrandDots /> {hero.eyebrow}
          </span>
          <h1
            id="hero-title"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(34px, 6vw, 58px)',
              lineHeight: 1.06,
              margin: 0,
              backgroundImage: brandRamp.gradient,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {hero.title}
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.6, margin: 0, maxWidth: 620 }}>
            {hero.body}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href={hero.cta.href} style={primaryCta}>
              {hero.cta.label}
            </Link>
            <Link href="/resources" style={secondaryCta}>
              What&apos;s new
            </Link>
          </div>
        </section>

        {/* Hero slider — remaining slides as a horizontal rail, so the section
            works without client-side JS. */}
        <section aria-label="What Palette Canvas does" style={{ paddingBottom: 32 }}>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(280px, 1fr)', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {HERO_SLIDES.slice(1).map((s) => (
              <article key={s.title} style={{ ...panelCard, gap: 4 }}>
                <span style={{ color: brandRamp.violet, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.eyebrow}</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, margin: '8px 0' }}>{s.title}</h2>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>{s.body}</p>
                <Link href={s.cta.href} style={{ color: brandRamp.cobalt, fontSize: 13, textDecoration: 'none', marginTop: 12 }}>
                  {s.cta.label} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Info cards */}
        <section aria-labelledby="why-title" style={{ padding: '32px 0' }}>
          <h2 id="why-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3.5vw, 34px)', margin: '0 0 20px' }}>
            Built for the whole delivery, not the demo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {INFO_CARDS.map((c) => (
              <article key={c.title} style={panelCard}>
                <span style={{ color: brandRamp.magenta, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.tag}</span>
                <h3 style={{ fontSize: 16, margin: '10px 0 8px' }}>{c.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-title" style={{ padding: '40px 0' }}>
          <h2 id="how-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3.5vw, 34px)', margin: '0 0 20px' }}>
            How it works
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {HOW_IT_WORKS.map((s) => (
              <li key={s.step} style={panelCard}>
                <span style={{ fontFamily: 'var(--font-mono)', color: brandRamp.cobalt, fontSize: 13 }}>{s.step}</span>
                <h3 style={{ fontSize: 16, margin: '8px 0' }}>{s.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Sign-up branching teaser (§8.3) */}
        <section aria-labelledby="start-title" style={{ padding: '24px 0 8px' }}>
          <div style={{ ...panelCard, background: brandRamp.gradient, color: '#0d0b19', border: 'none' }}>
            <h2 id="start-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 30px)', margin: 0 }}>
              Two ways in. No guest self-serve by design.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: '12px 0 0', maxWidth: 620, color: 'rgba(13, 11, 25, 0.82)' }}>
              Employees request an account through their organisation. Partner agencies apply for a workspace. Clients and third
              parties reach work through an invitation — they never sign themselves up.
            </p>
            <Link href="/signup" style={{ ...primaryCta, background: '#0d0b19', color: '#f5f1e8', marginTop: 16, alignSelf: 'flex-start' }}>
              Choose your path
            </Link>
          </div>
        </section>

        {/* Social links */}
        <section aria-label="Follow" style={{ padding: '32px 0', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Follow along</span>
          {SOCIALS.map(([label, href]) => (
            <a key={label} href={href} className="pc-public-link" rel="noreferrer noopener" target="_blank" style={{ color: 'var(--ink-dim)', fontSize: 13, textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

const primaryCta: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 999,
  background: brandRamp.gradient,
  color: '#0d0b19',
  fontWeight: 700,
  fontSize: 14,
  textDecoration: 'none',
};

const secondaryCta: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 999,
  border: '1px solid var(--line-strong)',
  color: 'var(--ink)',
  fontSize: 14,
  textDecoration: 'none',
};

const panelCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 20,
  borderRadius: 16,
  border: '1px solid var(--line)',
  background: 'var(--brand-raise)',
};