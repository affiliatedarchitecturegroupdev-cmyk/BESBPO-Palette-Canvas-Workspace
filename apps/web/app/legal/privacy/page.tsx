import { LegalPage, Clause, Callout } from '../LegalPage';

export const metadata = { title: 'Privacy notice — Palette Canvas' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="14 September 2026"
      intro="What personal data the workspace holds, why, where it is kept, and what you can ask us to do with it."
    >
      <Callout>
        Draft notice. The data locations and sub-processor list below describe the intended production deployment, not every
        development environment. Confirm the final wording with our data protection lead before publication.
      </Callout>

      <Clause heading="1. Who is responsible">
        <p>
          Palette Canvas Ltd is the data controller for the personal data held in your workspace. Where your organisation is the
          controller of its own client data, we act as a processor on its instructions.
        </p>
      </Clause>

      <Clause heading="2. What we hold">
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>Account data: name, work email, role, and role bindings that determine what you can see.</li>
          <li>Authentication data: session identity, multi-factor enrolment, and API keys you issue (stored hashed).</li>
          <li>Delivery records: projects, tasks, comments, versions, approvals and handover packs you create.</li>
          <li>Activity data: audit events recording who did what and when, including the agent tag on automated actions.</li>
          <li>Media: files you upload, their versions, and the derived metadata we record when inspecting them.</li>
        </ul>
      </Clause>

      <Clause heading="3. Why we hold it">
        <p>
          To operate the service you have asked for, to keep an accurate record of delivery, to meet our legal and accounting
          obligations, and to keep the platform secure. We do not sell personal data, and we do not use delivery content to train
          models.
        </p>
      </Clause>

      <Clause heading="4. Where it is kept">
        <p>
          Workspace data is stored in the United Kingdom on managed infrastructure. Where a sub-processor operates outside the UK,
          transfers rely on the UK International Data Transfer Addendum or an equivalent safeguard, and the arrangement is recorded
          in our sub-processor list.
        </p>
        <p>
          Backups are encrypted and held in the same jurisdiction. Restore drills are run on a schedule and evidenced in our
          operations records.
        </p>
      </Clause>

      <Clause heading="5. How long we keep it">
        <p>
          Retention is configurable per organisation. Delivery records follow the retention period your organisation sets, after
          which they are purged. A legal hold overrides the retention period and blocks purge until it is released.
        </p>
      </Clause>

      <Clause heading="6. Sharing">
        <p>
          Access inside the workspace is governed by engagement boundaries: a client sees its own engagement, a guest sees only the
          item they were invited to, and internal channels are never visible to external parties. Outside the workspace we share
          personal data only with sub-processors and advisers bound by confidentiality, or where the law requires it.
        </p>
      </Clause>

      <Clause heading="7. Your rights">
        <p>
          You can ask for a copy of your personal data, its correction, its deletion, or a restriction on how it is used, and you can
          object to processing carried out on a legitimate-interest basis. Requests go to our data protection contact and are
          answered within one month.
        </p>
        <p>If you are unhappy with our response you can complain to the Information Commissioner&apos;s Office (ICO).</p>
      </Clause>

      <Clause heading="8. Security">
        <p>
          Access is capability-based and enforced on the server. Sessions support multi-factor authentication; API keys are stored
          hashed and can be revoked. Security headers are applied to every response, uploads are inspected, and audit logging cannot
          be disabled by a user.
        </p>
      </Clause>
    </LegalPage>
  );
}