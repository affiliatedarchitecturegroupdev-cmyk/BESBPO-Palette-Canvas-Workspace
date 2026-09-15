import { LegalPage, Clause, Callout } from '../LegalPage';

export const metadata = { title: 'Accessibility — Palette Canvas' };

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      updated="14 September 2026"
      intro="Where the workspace stands against WCAG 2.2 AA, and the honest list of what is not finished."
    >
      <Callout>
        We are not claiming full conformance. The core workspace has been remediated and audited; several surfaces listed below
        still have known gaps, and third-party embedded content is outside our control.
      </Callout>

      <Clause heading="1. Our target">
        <p>
          We aim for WCAG 2.2 Level AA across the workspace. That is the standard we test against and the standard we will hold
          ourselves to in any accessibility statement we publish.
        </p>
      </Clause>

      <Clause heading="2. What we have done">
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>Every form control carries a programmatic name, either a label or an accessible name.</li>
          <li>The application chrome exposes banner, navigation and main landmarks, and the drawer is keyboard operable.</li>
          <li>Interactive targets meet the 24×24 minimum target size, with visible focus styling throughout.</li>
          <li>Status is never conveyed by colour alone — badges pair a tone with text.</li>
          <li>Live updates announce through an ARIA live region rather than moving focus.</li>
        </ul>
        <p>The audit record behind these claims is kept in our operations repository alongside the remediation notes.</p>
      </Clause>

      <Clause heading="3. Known gaps">
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>Some dense board views still rely on horizontal scrolling at 400% zoom; a stacked layout is in progress.</li>
          <li>Older uploaded documents may lack the metadata needed for a useful alternative description.</li>
          <li>Third-party embedded meeting rooms are subject to the vendor&apos;s own accessibility.</li>
          <li>Legal and marketing pages are covered by automated checks but not yet by a manual assistive-technology pass.</li>
        </ul>
      </Clause>

      <Clause heading="4. How we test">
        <p>
          Automated checks run in continuous integration, and manual passes use a screen reader with keyboard-only navigation.
          Accessibility is a release gate for the core workspace, not an afterthought.
        </p>
      </Clause>

      <Clause heading="5. Telling us about a barrier">
        <p>
          If something blocks you, contact us through the help centre with the page and what you were trying to do. We aim to
          acknowledge within two working days and to give you a workaround where one exists.
        </p>
      </Clause>
    </LegalPage>
  );
}