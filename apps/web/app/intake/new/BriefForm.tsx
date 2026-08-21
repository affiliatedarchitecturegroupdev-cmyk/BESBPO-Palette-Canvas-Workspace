'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Agency, Brand, Template } from '@/lib/api';

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  fontSize: 14,
  marginTop: 4,
};

/** Structured brief builder — mandatory fields come from the template. */
export default function BriefForm({
  apiUrl,
  email,
  agencies,
  brands,
  templates,
}: {
  apiUrl: string;
  email: string;
  agencies: Agency[];
  brands: Brand[];
  templates: Template[];
}) {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
  const agencyBrands = useMemo(() => brands.filter((b) => b.agency_id === agencyId), [brands, agencyId]);

  async function submit() {
    setError('');
    const res = await fetch(`${apiUrl}/intake`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify({
        agencyId,
        brandId,
        templateId: templateId || undefined,
        title,
        requestedDate: requestedDate || undefined,
        fields: fieldValues,
        attachments: attachmentUrl ? [{ label: 'Reference', url: attachmentUrl }] : [],
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? `HTTP ${res.status}`);
      return;
    }
    router.push('/intake');
    router.refresh();
  }

  return (
    <section style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 24, maxWidth: 720 }}>
      <Label text="Agency">
        <select value={agencyId} onChange={(e) => { setAgencyId(e.target.value); setBrandId(''); }} style={input}>
          <option value="">—</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Label>
      <Label text="Brand">
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={input}>
          <option value="">—</option>
          {agencyBrands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Label>
      <Label text="Service template">
        <select
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setFieldValues({});
          }}
          style={input}
        >
          <option value="">None (ad-hoc)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (v{t.version})
            </option>
          ))}
        </select>
      </Label>
      <Label text="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} />
      </Label>
      <Label text="Requested delivery date">
        <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} style={input} />
      </Label>
      <Label text="Attachment URL (reference material)">
        <input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} style={input} />
      </Label>

      {template && (
        <>
          <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginBottom: 4 }}>
            Required fields — {template.name}
          </h3>
          {template.definition.requiredBriefFields.map((f) => (
            <Label key={f.name} text={f.label}>
              {f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={fieldValues[f.name] ?? ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [f.name]: e.target.value })}
                  style={input}
                />
              ) : (
                <input
                  value={fieldValues[f.name] ?? ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [f.name]: e.target.value })}
                  style={input}
                />
              )}
            </Label>
          ))}
        </>
      )}

      {error && <p style={{ color: 'var(--accent)', fontSize: 13 }}>{error}</p>}
      <button
        onClick={submit}
        disabled={!agencyId || !brandId || !title}
        style={{
          marginTop: 16,
          background: 'var(--accent)',
          color: 'var(--paper)',
          border: 0,
          padding: '10px 22px',
          fontSize: 13,
          letterSpacing: '0.1em',
          opacity: !agencyId || !brandId || !title ? 0.4 : 1,
        }}
      >
        SUBMIT TO INTAKE
      </button>
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginTop: 14, fontSize: 12, color: 'var(--ink-dim)' }}>
      {text}
      {children}
    </label>
  );
}
