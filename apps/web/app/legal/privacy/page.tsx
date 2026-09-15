import { LegalPage, Clause, Callout } from '../LegalPage';
import { SUPPORT_EMAIL } from '../contact';

export const metadata = { title: 'Privacy policy — Palette Canvas' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="What this platform actually collects, why, where it is kept, and what you can ask us to do with it."
    >
      <Callout>
        <strong>Drafted content.</strong> Consistent with the &ldquo;pending qualified legal review&rdquo; framing used elsewhere
        in Palette Canvas&apos;s documentation, this is not yet confirmed as final. See the note on UK data in section 3.
      </Callout>

      <Clause heading="1. What this platform actually collects">
        <p>Grounded in what the platform&apos;s real architecture processes, not a generic list:</p>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>
            <strong>Account and identity data</strong> — name, email, role, and employment or engagement attributes, managed
            through the platform&apos;s identity provider.
          </li>
          <li>
            <strong>Content you create</strong> — boards, items, briefs, messages, comments, and files you or your organisation
            upload or create within the platform.
          </li>
          <li>
            <strong>Usage and activity data</strong> — the platform&apos;s audit log, and dashboard metrics derived from your own
            activity.
          </li>
          <li>
            <strong>Third-party integration data</strong> — if you connect Adobe, Canva or Dropbox, the platform stores the
            authorisation needed to maintain that connection. If you use the research or asset-sourcing AI agents, your queries to
            those tools are logged for the same auditability reasons as everything else on this platform.
          </li>
        </ul>
      </Clause>

      <Clause heading="2. What we do not do">
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 6 }}>
          <li>We do not sell your data.</li>
          <li>
            We do not use your engagement content to train any AI model — the platform&apos;s AI agents operate on your data to
            assist your work, not to learn from it for use elsewhere.
          </li>
          <li>
            We do not grant Palette Canvas staff visibility into a Partner Agency&apos;s internal-only channels — that boundary is
            enforced at the database level, not just described here.
          </li>
        </ul>
      </Clause>

      <Clause heading="3. Data residency">
        <p>
          Primary infrastructure is hosted on Render, with data processing aligned to Besbpo Workspace OS&apos;s established
          South-Africa-first data residency approach.
        </p>
        <Callout>
          <strong>UK data — open item, not yet resolved.</strong> If you are a UK Partner Agency, your data is currently processed
          under this same South-Africa-aligned architecture unless and until a UK-specific data residency decision is made. If UK
          GDPR applies to your organisation&apos;s data independent of where it is hosted, this is worth raising directly before
          relying on this policy as final for a UK engagement. This question needs a decision and likely qualified legal review —
          it is not something to resolve by assumption in either direction.
        </Callout>
      </Clause>

      <Clause heading="4. Your rights">
        <p>
          Consistent with POPIA: you may request access to, correction of, or deletion of your personal information, subject to
          what is legally and contractually required to be retained. For example, audit log entries relevant to an active
          engagement dispute are not deleted on request during that engagement.
        </p>
      </Clause>

      <Clause heading="5. Retention">
        <p>
          Content and account data are retained for the duration of your engagement plus a reasonable period after, consistent with
          the corporate site&apos;s own retention practices. Guest-tier access data is retained only as long as needed for the audit
          trail of that specific scoped access — the access itself expires automatically, but the record that it occurred is
          retained for accountability.
        </p>
      </Clause>

      <Clause heading="6. Contact">
        <p>
          Questions about this policy, or data access, correction and deletion requests:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Clause>
    </LegalPage>
  );
}