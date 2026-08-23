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

  // Organisation (match by name so test fixtures never absorb demo data)
  const { rows: orgRows } = await pool.query(
    "SELECT id FROM organisation WHERE name = 'Besbpo Group' LIMIT 1",
  );
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

  // Demo project with Phase 3 production data (idempotent on name match).
  const tpl = (
    await pool.query('SELECT id FROM service_template WHERE org_id = $1 AND key = $2', [
      orgId,
      'brand_identity',
    ])
  ).rows[0];
  const { rows: existingProjects } = await pool.query(
    'SELECT id FROM project WHERE org_id = $1 AND name = $2',
    [orgId, 'Nimbus rebrand'],
  );
  const amId = (await pool.query('SELECT id FROM person WHERE email = $1', ['am@besbpo.example'])).rows[0].id;
  const leadId = (await pool.query('SELECT id FROM person WHERE email = $1', ['lead@besbpo.example'])).rows[0].id;
  const designId = (await pool.query('SELECT id FROM person WHERE email = $1', ['design@besbpo.example'])).rows[0].id;

  if (!existingProjects.length) {
    const projectId = randomUUID();
    await pool.query(
      'INSERT INTO project (id, org_id, agency_id, brand_id, template_id, name, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [projectId, orgId, agencyA, brandA, tpl.id, 'Nimbus rebrand', 'production', amId],
    );
    console.log('project seeded: Nimbus rebrand');

    const wsId = randomUUID();
    await pool.query('INSERT INTO workstream (id, project_id, name) VALUES ($1,$2,$3)', [
      wsId, projectId, 'Logo suite',
    ]);

    const dId = randomUUID();
    await pool.query(
      'INSERT INTO deliverable (id, org_id, project_id, workstream_id, name, deliverable_type, due_date, assignee_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [dId, orgId, projectId, wsId, 'Primary logo', 'logo', '2026-03-21', leadId],
    );

    const audit = { t: 'Logo research', dep: [] as string[] };
    const moodboards = { t: 'Moodboard concepts', dep: [] as string[] };
    const lockup = { t: 'Final lockups', dep: [moodboards.t] as string[] };
    const taskIds: Record<string, string> = {};
    for (const s of [audit.t, moodboards.t, lockup.t]) {
      taskIds[s] = randomUUID();
    }
    await pool.query(
      `INSERT INTO task (id, org_id, project_id, workstream_id, deliverable_id, title, status, priority, assignee_id, due_date, estimate_hours, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [taskIds[audit.t], orgId, projectId, wsId, dId, audit.t, 'in_progress', 'normal', designId, '2026-03-10', 8, leadId],
    );
    await pool.query(
      `INSERT INTO task (id, org_id, project_id, workstream_id, deliverable_id, title, status, priority, assignee_id, due_date, estimate_hours, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [taskIds[moodboards.t], orgId, projectId, wsId, dId, moodboards.t, 'backlog', 'normal', designId, '2026-03-19', 16, leadId],
    );
    await pool.query(
      `INSERT INTO task (id, org_id, project_id, workstream_id, deliverable_id, title, status, priority, assignee_id, due_date, estimate_hours, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [taskIds[lockup.t], orgId, projectId, wsId, dId, lockup.t, 'backlog', 'high', designId, '2026-03-20', 12, leadId],
    );
    await pool.query('INSERT INTO task_dependency (task_id, depends_on) VALUES ($1,$2)', [
      taskIds[lockup.t], taskIds[moodboards.t],
    ]);

    await pool.query(
      'INSERT INTO comment (id, org_id, target_type, target_id, body, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), orgId, 'project', projectId, 'Kickoff settled on 3 exploration lanes.', amId],
    );
    await pool.query('INSERT INTO project_role (project_id, person_id, role) VALUES ($1,$2,$3)', [
      projectId, leadId, 'production_lead',
    ]);
    console.log('phase-3 production data seeded');
  }

  await pool.end();
  console.log('seed complete');
}

void seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
