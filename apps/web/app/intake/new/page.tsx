import { currentEmail, agencies, brands, templates } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import BriefForm from './BriefForm';

export default async function NewBriefPage() {
  const email = await currentEmail();
  const [agencyRes, brandRes, tplRes] = await Promise.all([
    agencies(email),
    brands(email),
    templates(email),
  ]);

  if ('error' in agencyRes || 'error' in brandRes || 'error' in tplRes || !email) {
    return <p>Select a user with intake access to file a brief.</p>;
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 0 }}>New brief</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, maxWidth: 640 }}>
        Structured intake per the planning document: pick a service template to
        load its mandatory fields; attachments and confidentiality are tracked
        from the start.
      </p>
      <BriefForm
        apiUrl={BROWSER_API}
        email={email}
        agencies={agencyRes}
        brands={brandRes}
        templates={tplRes}
      />
    </main>
  );
}
