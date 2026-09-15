import { LegalPage, Clause, Callout } from '../LegalPage';

export const metadata = { title: 'Terms of service — Palette Canvas' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="14 September 2026"
      intro="These terms govern use of the Palette Canvas Workspace. They are written to be read: short clauses, plain descriptions of what each party is responsible for."
    >
      <Callout>
        This is a working draft kept in step with the product. It has not yet been reviewed by our external counsel, and it is not
        a substitute for the signed master services agreement under which your organisation engages us.
      </Callout>

      <Clause heading="1. Who these terms are between">
        <p>
          These terms are between Palette Canvas Ltd (“we”, “us”) and the organisation that operates your workspace (“you”). Where
          your organisation has a signed master services agreement with us, that agreement takes precedence over anything here.
        </p>
        <p>
          Individual users — employees, partner-agency staff, clients and third parties — use the workspace under their
          organisation&apos;s agreement and the access granted to them by that organisation.
        </p>
      </Clause>

      <Clause heading="2. Accounts and access">
        <p>
          Accounts are issued by your organisation. Employees request access through their employer; partner agencies apply for a
          workspace. Clients and third parties are invited to specific work and cannot register themselves.
        </p>
        <p>
          Guest access is deliberately narrow: a guest link resolves to the item it was issued for, carries an expiry, and can be
          revoked at any time. You are responsible for sharing invitations only with the intended recipient.
        </p>
      </Clause>

      <Clause heading="3. Acceptable use">
        <p>You agree not to use the workspace to:</p>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>upload unlawful material, or material you do not have the right to share;</li>
          <li>attempt to reach data belonging to another engagement or another organisation;</li>
          <li>circumvent permission checks, rate limits or audit logging;</li>
          <li>upload files containing malware, or use file sharing to distribute it.</li>
        </ul>
        <p>Automated agents may only act within the autonomy level declared for them. Human approval remains the gate for any action that changes delivery records.</p>
      </Clause>

      <Clause heading="4. Content and intellectual property">
        <p>
          You retain ownership of the material you upload. You grant us the licence needed to store, process, back up and display
          that material in order to run the service — nothing wider.
        </p>
        <p>The software, its design system and its documentation remain our intellectual property.</p>
      </Clause>

      <Clause heading="5. Availability and support">
        <p>
          We target the availability and support response times recorded in your master services agreement. Planned maintenance is
          announced in advance through the resources page. Where we fall short of a target, the service-credit terms in your
          agreement apply.
        </p>
      </Clause>

      <Clause heading="6. Suspension and termination">
        <p>
          You may stop using the workspace at any time. We may suspend access where necessary to protect the service or other
          customers, or where these terms are materially breached.
        </p>
        <p>
          On termination, your data is retained only for the retention period your organisation has configured, unless a legal hold
          requires longer. Exports are available before that window closes.
        </p>
      </Clause>

      <Clause heading="7. Liability">
        <p>
          Nothing here excludes liability that cannot lawfully be excluded. Subject to that, our liability is limited to the amounts
          set out in your master services agreement.
        </p>
      </Clause>

      <Clause heading="8. Governing law">
        <p>These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.</p>
      </Clause>
    </LegalPage>
  );
}