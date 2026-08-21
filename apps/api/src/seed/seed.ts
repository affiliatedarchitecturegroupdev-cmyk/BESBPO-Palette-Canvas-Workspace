import 'reflect-metadata';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { migrate } from '../db/migrate';
import { DATABASE_URL, migrationsDir } from '../db/paths';
import { TemplateDefinition } from '../templates/templates.service';

/**
 * Seeds the pilot demo dataset: one organisation, role-bearing users, two
 * agencies with brands, two service templates (per MVP pilot scope), and a
 * brief converted into a project with milestones and roles.
 */
const url = DATABASE_URL;

const users = [
  { email: 'ops@besbpo.example', name: 'Olivia Ops', role: 'operations_director', scope: 'organisation' },
  { email: 'am@besbpo.example', name: 'Ava Manager', role: 'account_manager', scope: 'organisation' },
  { email: 'lead@besbpo.example', name: 'Liam Lead', role: 'production_lead', scope: 'organisation' },
  { email: 'design@besbpo.example', name: 'Dana Creative', role: 'creative_contributor', scope: 'organisation' },
  { email: 'qa@besbpo.example', name: 'Quinn Reviewer', role: 'quality_reviewer', scope: 'organisation' },
  { email: 'finance@besbpo.example', name: 'Fin Finance', role: 'finance_user', scope: 'organisation' },
];

interface TemplateSeed {
  key: string;
  name: string;
  definition: TemplateDefinition;
}

const templates: TemplateSeed[] = [
  {
    key: 'brand_identity',
    name: 'Brand Identity Redesign',
    definition: {
      phases: ['planning', 'production', 'internal_qa', 'proofing', 'handover'],
      requiredBriefFields: [
        { name: 'brand_values', label: 'Brand values', type: 'textarea' },
        { name: 'deliverable_list', label: 'Expected deliverables', type: 'textarea' },
      ],
      deliverables: ['Logo suite', 'Brand guidelines', 'Asset starter kit'],
      qualityChecks: ['Technical validation', 'Brand checklist'],
      slaTargets: { triageHours: 24 },
      approvalSteps: ['Internal QA', 'Client approval'],
      handoverRequirements: ['Deliverable manifest', 'Licence notes', 'Acceptance sign-off'],
    },
  },
  {
    key: 'social_retainer',
    name: 'Social Content Retainer',
    definition: {
      phases: ['planning', 'production', 'proofing', 'handover'],
      requiredBriefFields: [
        { name: 'monthly_volume', label: 'Monthly content volume', type: 'text' },
        { name: 'channels', label: 'Channels', type: 'text' },
      ],
      deliverables: ['Monthly content batch'],
      qualityChecks: ['Copy/presentation check'],
      slaTargets: { triageHours: 8 },
      approvalSteps: ['Client approval'],
      handoverRequirements: ['Month-end package', 'Schedule update'],
    },
  },
];

async function seed() {
  const pool = new Pool({ connectionString: url });
  await migrate(pool, migrationsDir(__dirname));

  // Organisation
  const { rows: orgRows } = await pool.query('SELECT id FROM organisation LIMIT 1');
  let orgId: string;
  if (orgRows.length) {
    orgId = orgRows[0].id;
    console.log('organisation exists:', orgId);
  } else {
    orgId = randomUUID();
    await pool.query('INSERT INTO organisation (id, name) VALUES ($1, $2)', [orgId, 'Besbpo Group']);
    console.log('organisation created:', orgId);
  }

  // Users + org-scoped role bindings
  for (const u of users) {
    const { rows } = await pool.query('SELECT id FROM person WHERE email = $1', [u.email]);
    let personId: string;
    if (rows.length) {
      personId = rows[0].id;
    } else {
      personId = randomUUID();
      await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
        personId, orgId, u.email, u.name,
      ]);
    }
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
       VALUES ($1, $2, 'organisation', $3) ON CONFLICT DO NOTHING`,
      [personId, u.role, orgId],
    );
  }

  // Agencies + brands
  async function ensureAgency(name: string): Promise<string> {
    const { rows } = await pool.query('SELECT id FROM agency WHERE org_id = $1 AND name = $2', [orgId, name]);
    if (rows.length) return rows[0].id;
    const id = randomUUID();
    await pool.query('INSERT INTO agency (id, org_id, name) VALUES ($1, $2, $3)', [id, orgId, name]);
    return id;
  }
  async function ensureBrand(agencyId: string, name: string): Promise<string> {
    const { rows } = await pool.query('SELECT id FROM brand WHERE org_id = $1 AND name = $2', [orgId, name]);
    if (rows.length) return rows[0].id;
    const id = randomUUID();
    await pool.query('INSERT INTO brand (id, org_id, agency_id, name) VALUES ($1, $2, $3, $4)', [
      id, orgId, agencyId, name,
    ]);
    return id;
  }

  const agencyA = await ensureAgency('Northwind Agency');
  const agencyB = await ensureAgency('Acme Studio');
  const brandA = await ensureBrand(agencyA, 'Nimbus Coffee');
  const brandB = await ensureBrand(agencyB, 'Velocity Fitness');

  // Agency-scoped users (can only see their own agency)
  const agencyUsers = [
    { email: 'agency-a@northwind.example', name: 'Nia Northwind', agency: agencyA, role: 'agency_admin' },
    { email: 'agency-b@acme.example', name: 'Ada Acme', agency: agencyB, role: 'agency_admin' },
    { email: 'client-a@nimbus.example', name: 'Ken Client', agency: agencyA, role: 'client_approver' },
  ];
  for (const u of agencyUsers) {
    const { rows } = await pool.query('SELECT id FROM person WHERE email = $1', [u.email]);
    let personId: string;
    if (rows.length) {
      personId = rows[0].id;
    } else {
      personId = randomUUID();
      await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
        personId, orgId, u.email, u.name,
      ]);
    }
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
       VALUES ($1, $2, 'agency', $3) ON CONFLICT DO NOTHING`,
      [personId, u.role, u.agency],
    );
  }

  // Templates (latest versions)
  for (const t of templates) {
    const { rows } = await pool.query(
      'SELECT id FROM service_template WHERE org_id = $1 AND key = $2 ORDER BY version DESC LIMIT 1',
      [orgId, t.key],
    );
    if (!rows.length) {
      await pool.query(
        'INSERT INTO service_template (id, org_id, key, name, version, definition) VALUES ($1, $2, $3, $4, 1, $5)',
        [randomUUID(), orgId, t.key, t.name, JSON.stringify(t.definition)],
      );
      console.log('template seeded:', t.key);
    }
  }

  await pool.end();
  console.log('seed complete');
}

void seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
