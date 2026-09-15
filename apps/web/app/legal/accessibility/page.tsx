import { LegalPage, Clause, Callout } from '../LegalPage';
import { SUPPORT_EMAIL } from '../contact';

export const metadata = { title: 'Accessibility statement — Palette Canvas' };

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility statement"
      intro="Our target standard, what is already true, what is still a commitment, and the honest list of what is not finished."
    >
      <Callout>
        <strong>Not a claim of conformance.</strong> This statement is built from the product design and the architecture
        specification, not an accessibility audit of the whole codebase. Overclaiming compliance here would be a worse failure
        than stating an honest target and a real gap.
      </Callout>

      <Clause heading="1. Our target standard">
        <p>
          Palette Canvas Workspace is being built toward <strong>WCAG 2.1 Level AA</strong> — the standard most commonly required
          for business software, and the concrete target for ongoing development. It is a target, not a certification already
          achieved.
        </p>
      </Clause>

      <Clause heading="2. What is already true, and what is a commitment">
        <p>
          <strong>Observable from the current product design:</strong>
        </p>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>
            A consistent dark theme with a deliberate accent-colour system, rather than colour used as the only signal for status.
            This warrants formal verification against WCAG contrast ratios as development continues — not an assumption of
            compliance because it looks reasonable.
          </li>
        </ul>
        <p>
          <strong>Concrete commitments for the development roadmap:</strong>
        </p>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>Full keyboard navigation across boards, items, and views — no interaction that requires a mouse.</li>
          <li>
            Screen reader support via correct semantic HTML and ARIA labelling, especially for the custom column-type inputs and
            the Kanban, Gantt and Calendar views — exactly the kind of custom-rendered UI that is easy to get visually right and
            accessibly wrong.
          </li>
          <li>Verified colour contrast ratios for the existing dark theme, checked directly against WCAG AA thresholds.</li>
          <li>Respect for reduced-motion preferences in any view transition or animation.</li>
        </ul>
      </Clause>

      <Clause heading="3. Reporting an issue">
        <p>
          If you encounter an accessibility barrier using this platform, contact{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with what you were trying to do and what happened. Specific
          reports are what make this page&apos;s commitments real rather than aspirational.
        </p>
      </Clause>

      <Clause heading="4. Status">
        <p>
          This statement will be updated as accessibility work is actually completed and verified — not preemptively, so that it
          remains an honest reflection of real progress rather than a static promise.
        </p>
      </Clause>
    </LegalPage>
  );
}