import { currentEmail, templates } from '@/lib/api';

export default async function TemplatesPage() {
  const email = await currentEmail();
  const res = await templates(email);
  if ('error' in res) {
    return <p style={{ color: 'var(--ink-dim)' }}>Templates unavailable — check your access.</p>;
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 0 }}>Service templates</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
        Templates define phases, required brief fields, deliverables, checks, SLA targets,
        approval steps, and handover requirements (planning document section 3).
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 20 }}>
        {res.map((t) => (
          <section key={t.id} style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>
              {t.name}{' '}
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                (v{t.version}, key {t.key})
              </span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 12 }}>
              <Col title="Phases" items={t.definition.phases} />
              <Col
                title="Required brief fields"
                items={t.definition.requiredBriefFields.map((f) => f.label)}
              />
              <Col title="Deliverables" items={t.definition.deliverables} />
              <Col title="Quality checks" items={t.definition.qualityChecks} />
              <Col title="Approval steps" items={t.definition.approvalSteps} />
              <Col title="Handover" items={t.definition.handoverRequirements} />
              <Col title="Triage SLA" items={[`${t.definition.slaTargets.triageHours}h`]} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Col({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{title}</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 13, color: 'var(--ink-dim)' }}>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
