# Accessibility audit + remediation — 2026-08-23 (P5-03)

Scope: `apps/web` (Next.js). Roadmap exit criteria: every form input carries an
`aria-label` or `<label>`, and nav landmarks (banner/main/nav) exist.

## Landmarks

- **banner** — root layout had a `<nav>` only; it is now `<header>` containing
  `<nav aria-label="Primary">`, so the banner, navigation, and per-page
  `<main>` landmarks are all present.
- **main** — every route page already renders a `<main>`; unchanged.
- **nav** — the board/list/calendar switcher in `BoardView` is a `<nav>` with
  no name; labelled `aria-label="Work view"` to disambiguate it from the
  primary nav.

## Form controls audited (26 total)

| Control | File | Before | After |
|---|---|---|---|
| Agency / Brand / Service template / Title / Requested date / Attachment URL / template fields | `intake/new/BriefForm.tsx` | implicit `<label>` wrapper | compliant (unchanged) |
| estimate (hours), notes | `intake/[id]/TriagePanel.tsx` | implicit `<label>` wrapper | compliant (unchanged) |
| milestone name, target date, status, person, role | `projects/[id]/ProjectActions.tsx` | implicit `<label>` wrapper | compliant (unchanged) |
| change request title, hours | `deliverables/[id]/page.tsx` | `aria-label` | compliant (unchanged) |
| checklist toggle checkboxes | `projects/[id]/TaskDrawer.tsx` | `<label>` wraps input + text | compliant (unchanged) |
| Switch user | `UserSwitcher.tsx` | none | `aria-label="Switch user"` |
| per-card status select | `projects/[id]/BoardView.tsx` | none | `aria-label={"Status for {title}"}` |
| new checklist item | `projects/[id]/TaskDrawer.tsx` | none | `aria-label="New checklist item"` |
| hours to log | `projects/[id]/TaskDrawer.tsx` | none | `aria-label="Hours to log"` |
| new comment | `projects/[id]/TaskDrawer.tsx` | none | `aria-label="New comment"` |
| new QA item (per version) | `deliverables/[id]/ProofingView.tsx` | none | `aria-label={"New QA item for version {n}"}` |
| new version label | `deliverables/[id]/ProofingView.tsx` | none | `aria-label="New version label"` |
| new version URI | `deliverables/[id]/ProofingView.tsx` | none | `aria-label="New version URI"` |

Result: **26/26 controls are programmatically named** (17 via `<label>`, 9 via
`aria-label`).

## Bonus

- `TaskDrawer` close button (icon-only ✕) had no accessible name →
  `aria-label="Close task"`.

## Out of scope (noted for a later pass, not blocking pilot)

- Colour-contrast sweep against the palette tokens (needs a rendered-browser
  tool, e.g. axe-core/Playwright — not available in this environment).
- Focus indicators / keyboard trap audit of the drawer overlay.
- `lang` is set (`<html lang="en">`); no skip-to-content link yet.

## Gates

- `npm run build` — clean, 0 TS errors.
- `npm test` — e2e 55/55, permission tests pass.
- `apps/web`: `next build` — 0 warnings (jsx-a11y plugin active, no offences).
