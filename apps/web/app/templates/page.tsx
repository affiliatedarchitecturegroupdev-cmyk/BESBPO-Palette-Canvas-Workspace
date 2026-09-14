import { currentEmail, templates } from '@/lib/api';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';

export default async function TemplatesPage() {
  const email = await currentEmail();
  const res = await templates(email);
  if ('error' in res) {
    return <p style={{ color: 'var(--ink-dim)' }}>Templates unavailable — check your access.</p>;
  }

  return (
    <main>
      <PageHeader
        eyebrow="Operate"
        title="Service templates"
        subtitle="Templates define phases, required brief fields, deliverables, checks, SLA targets, approval steps, and handover requirements."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {res.map((t) => (
          <Card key={t.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 18 }}>{t.name}</h2>
              <Badge tone="accent">v{t.version}</Badge>
              <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>key · {t.key}</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginTop: 16,
              }}
            >
              <Col title="Phases" items={t.definition.phases} />
              <Col title="Required brief fields" items={t.definition.requiredBriefFields.map((f) => f.label)} />
              <Col title="Deliverables" items={t.definition.deliverables} />
              <Col title="Quality checks" items={t.definition.qualityChecks} />
              <Col title="Approval steps" items={t.definition.approvalSteps} />
              <Col title="Handover" items={t.definition.handoverRequirements} />
              <Col title="Triage SLA" items={[`${t.definition.slaTargets.triageHours}h`]} />
            </div>
          </Card>
        ))}
        {res.length === 0 && <EmptyState title="No templates" body="Service templates will appear here when the platform catalogs them." />}
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
