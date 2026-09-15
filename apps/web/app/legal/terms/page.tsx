import { LegalPage, Clause, Callout } from '../LegalPage';
import { SUPPORT_EMAIL } from '../contact';

export const metadata = { title: 'Terms of service — Palette Canvas' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="These terms govern use of the Palette Canvas Workspace platform itself — account access, content you create or upload within it, and platform availability."
    >
      <Callout>
        <strong>Scope.</strong> These terms do not replace the Professional Services Agreement governing your production
        engagement, nor the corporate website&apos;s own Terms of Service — those remain separately in force for their own scope.
        This is drafted content, pending qualified legal review.
      </Callout>

      <Clause heading="1. Accounts">
        <p>
          Access requires an account provisioned through Palette Canvas&apos;s identity system. Internal staff accounts are
          provisioned by Palette Canvas administration. Partner Agency and Guest accounts are provisioned by your Palette Canvas
          account contact, or generated as scoped, time-boxed access links.
        </p>
        <p>You are responsible for activity under your own credentials. Report suspected unauthorized access immediately.</p>
      </Clause>

      <Clause heading="2. Acceptable use">
        <p>The platform exists to support Palette Canvas engagements. You agree not to:</p>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>use the platform to store or transmit content unrelated to an active engagement;</li>
          <li>attempt to access boards, items, or data outside your account&apos;s scoped permissions, including through automated means;</li>
          <li>share Guest-tier access links with anyone beyond the intended recipient;</li>
          <li>
            use any integrated third-party service — the Adobe, Canva or Dropbox integrations, or the research and asset-sourcing
            agents — in a way that violates that third party&apos;s own terms of service.
          </li>
        </ul>
      </Clause>

      <Clause heading="3. Content you create or upload">
        <p>
          You retain ownership of content you upload or create within the platform, subject to the intellectual property terms of
          your underlying engagement (see the Professional Services Agreement and the corporate site&apos;s IP Ownership page).
          Palette Canvas stores and processes this content solely to operate the platform and deliver the engagement — not for any
          independent use.
        </p>
      </Clause>

      <Clause heading="4. Platform availability">
        <p>
          Palette Canvas takes reasonable measures to keep the platform available but does not guarantee uninterrupted access.
          Planned maintenance windows are communicated in advance where practical.
        </p>
        <p>
          This section does not constitute a formal SLA. A formal uptime commitment, if one applies to your engagement, is set out
          in your Professional Services Agreement, not here.
        </p>
      </Clause>

      <Clause heading="5. Termination of access">
        <p>
          Access is tied to an active engagement or an explicitly time-boxed Guest link. Palette Canvas may suspend or terminate
          platform access on engagement end, on reasonable suspicion of a Section 2 violation, or as otherwise set out in your
          Professional Services Agreement.
        </p>
        <p>Guest access expires automatically per its stated expiry without requiring manual action by either party.</p>
      </Clause>

      <Clause heading="6. Changes to these terms">
        <p>Palette Canvas may update these terms; continued platform use after a change constitutes acceptance of the update.</p>
      </Clause>

      <Clause heading="7. Contact">
        <p>
          Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Clause>
    </LegalPage>
  );
}