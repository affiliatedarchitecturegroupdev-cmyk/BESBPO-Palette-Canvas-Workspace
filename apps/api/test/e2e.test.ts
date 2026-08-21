import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { migrate } from '../src/db/migrate';
import { DATABASE_URL, migrationsDir } from '../src/db/paths';

/**
 * End-to-end flow test against a real Postgres instance:
 * intake → triage → conversion → project home, with permission negatives.
 */
const url = DATABASE_URL;

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ok: ${name}`);
  } else {
    failed++;
    console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

interface ApiOptions {
  email?: string;
  method?: string;
  body?: unknown;
}

async function api(base: string, path: string, opts: ApiOptions = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.email ? { 'x-user-email': opts.email } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function main() {
  const pool = new Pool({ connectionString: url });
  await migrate(pool, migrationsDir(__dirname));

  // Clean slate
  await pool.query(`
    TRUNCATE audit_event, project_role, milestone, project, brief,
      service_template, contact, brand, agency, role_binding, person, organisation
    CASCADE
  `);

  // Fixtures
  const orgId = randomUUID();
  await pool.query('INSERT INTO organisation (id, name) VALUES ($1, $2)', [orgId, 'Test Org']);

  const orgUsers: Array<[string, string]> = [
    ['ops@test.example', 'operations_director'],
    ['am@test.example', 'account_manager'],
    ['lead@test.example', 'production_lead'],
  ];
  for (const [email, role] of orgUsers) {
    const id = randomUUID();
    await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
      id, orgId, email, email,
    ]);
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
       VALUES ($1, $2, 'organisation', $3)`,
      [id, role, orgId],
    );
  }

  const agencyA = randomUUID();
  const agencyB = randomUUID();
  await pool.query('INSERT INTO agency (id, org_id, name) VALUES ($1, $2, $3)', [agencyA, orgId, 'Agency A']);
  await pool.query('INSERT INTO agency (id, org_id, name) VALUES ($1, $2, $3)', [agencyB, orgId, 'Agency B']);
  const brandA = randomUUID();
  await pool.query('INSERT INTO brand (id, org_id, agency_id, name) VALUES ($1, $2, $3, $4)', [
    brandA, orgId, agencyA, 'Brand A',
  ]);

  const agencyUserA = randomUUID();
  await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
    agencyUserA, orgId, 'agency-a@test.example', 'Agency A Admin',
  ]);
  await pool.query(
    `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
     VALUES ($1, 'agency_admin', 'agency', $2)`,
    [agencyUserA, agencyA],
  );

  const agencyUserB = randomUUID();
  await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
    agencyUserB, orgId, 'agency-b@test.example', 'Agency B Admin',
  ]);
  await pool.query(
    `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
     VALUES ($1, 'agency_admin', 'agency', $2)`,
    [agencyUserB, agencyB],
  );

  const clientApprover = randomUUID();
  await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
    clientApprover, orgId, 'client@test.example', 'Client A Approver',
  ]);
  await pool.query(
    `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
     VALUES ($1, 'client_approver', 'agency', $2)`,
    [clientApprover, agencyA],
  );

  // Template
  const templateId = randomUUID();
  await pool.query(
    `INSERT INTO service_template (id, org_id, key, name, version, definition)
     VALUES ($1, $2, 'brand_identity', 'Brand Identity', 1, $3)`,
    [
      templateId,
      orgId,
      JSON.stringify({
        phases: ['planning', 'production', 'internal_qa', 'proofing', 'handover'],
        requiredBriefFields: [{ name: 'brand_values', label: 'Brand values', type: 'textarea' }],
        deliverables: ['Logo suite'],
        qualityChecks: ['Technical validation'],
        slaTargets: { triageHours: 24 },
        approvalSteps: ['Internal QA', 'Client approval'],
        handoverRequirements: ['Deliverable manifest'],
      }),
    ],
  );

  // Boot the app
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0);
  const address = app.getHttpServer().address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;

  try {
    console.log('e2e: identity');
    const unauth = await api(base, '/directory/agencies');
    check('unauthenticated request is rejected', unauth.status === 401);
    const me = await api(base, '/identity/me', { email: 'am@test.example' });
    check('me resolves account manager', me.status === 200 && (me.json as { roles: string[] }).roles.includes('account_manager'));

    console.log('e2e: directory scoping');
    const listA = await api(base, '/directory/agencies', { email: 'agency-a@test.example' });
    check('agency A sees only own agency', (listA.json as unknown[]).length === 1);
    const listOps = await api(base, '/directory/agencies', { email: 'ops@test.example' });
    check('ops sees all agencies', (listOps.json as unknown[]).length === 2);
    const agencyDenied = await api(base, '/directory/agencies', { email: 'agency-a@test.example', method: 'POST', body: { name: 'X' } });
    check('agency cannot create agency (403)', agencyDenied.status === 403);

    console.log('e2e: intake');
    const missingField = await api(base, '/intake', {
      email: 'agency-a@test.example',
      method: 'POST',
      body: { agencyId: agencyA, brandId: brandA, templateId, title: 'Rebrand', fields: {} },
    });
    check('template required field enforced (400)', missingField.status === 400);

    const briefRes = await api(base, '/intake', {
      email: 'agency-a@test.example',
      method: 'POST',
      body: {
        agencyId: agencyA,
        brandId: brandA,
        templateId,
        title: 'Rebrand',
        fields: { brand_values: 'warm, trustworthy' },
      },
    });
    check('brief created', briefRes.status === 201);
    const brief = briefRes.json as { id: string };
    const dup = await api(base, '/intake', {
      email: 'agency-a@test.example',
      method: 'POST',
      body: { agencyId: agencyA, brandId: brandA, title: 'rebrand', fields: {} },
    });
    check('duplicate detected', (dup.json as { duplicate_of: string | null }).duplicate_of === brief.id);

    const crossAgency = await api(base, '/intake', {
      email: 'agency-b@test.example',
      method: 'POST',
      body: { agencyId: agencyA, brandId: brandA, title: 'sneaky' },
    });
    check('agency B cannot file under agency A (403)', crossAgency.status === 403);

    const inboxB = await api(base, '/intake', { email: 'agency-b@test.example' });
    check('agency B sees no agency A briefs', (inboxB.json as unknown[]).length === 0);

    console.log('e2e: triage');
    const clientTriage = await api(base, `/triage/${brief.id}`, {
      email: 'client@test.example',
      method: 'POST',
      body: { decision: 'qualified', capabilityOk: true },
    });
    check('client cannot triage (403)', clientTriage.status === 403);
    const triaged = await api(base, `/triage/${brief.id}`, {
      email: 'am@test.example',
      method: 'POST',
      body: { decision: 'qualified', estimateHours: 120, capabilityOk: true, riskFlags: ['tight_deadline'] },
    });
    check('account manager triages', triaged.status === 201 && (triaged.json as { status: string }).status === 'qualified');

    console.log('e2e: conversion + project home');
    const clientConvert = await api(base, '/projects/convert', {
      email: 'client@test.example',
      method: 'POST',
      body: { briefId: brief.id },
    });
    check('client cannot convert (403)', clientConvert.status === 403);
    const converted = await api(base, '/projects/convert', {
      email: 'am@test.example',
      method: 'POST',
      body: { briefId: brief.id },
    });
    check('brief converts to project', converted.status === 201);
    const project = converted.json as { id: string; status: string };
    check('project starts at template first phase', project.status === 'planning');

    const home = await api(base, `/projects/${project.id}`, { email: 'am@test.example' });
    check('project home loads', home.status === 200 && (home.json as { brief: unknown }).brief !== null);

    const milestone = await api(base, `/projects/${project.id}/milestones`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { name: 'Kickoff', targetDate: '2026-09-01' },
    });
    check('production lead adds milestone', milestone.status === 201);

    const personRows = await pool.query<{ id: string }>('SELECT id FROM person WHERE email = $1', ['lead@test.example']);
    const roleAssign = await api(base, `/projects/${project.id}/roles`, {
      email: 'am@test.example',
      method: 'POST',
      body: { personId: personRows.rows[0].id, role: 'production_lead' },
    });
    check('role assigned to project', roleAssign.status === 201);

    const statusMove = await api(base, `/projects/${project.id}/status`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { status: 'production' },
    });
    check('status transition to production', statusMove.status === 201 && (statusMove.json as { status: string }).status === 'production');

    const audit = await api(base, '/audit', { email: 'ops@test.example' });
    const actions = (audit.json as Array<{ action: string }>).map((a) => a.action);
    check('audit captured conversions and status change',
      actions.includes('brief.converted_to_project') && actions.includes('project.status_changed') && actions.includes('project.role_assigned'));
    const auditDenied = await api(base, '/audit', { email: 'agency-a@test.example' });
    check('agency cannot read audit (403)', auditDenied.status === 403);

    console.log('e2e: tenancy negatives');
    const otherOrg = randomUUID();
    await pool.query('INSERT INTO organisation (id, name) VALUES ($1, $2)', [otherOrg, 'Other Org']);
    const outsider = randomUUID();
    await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1, $2, $3, $4)', [
      outsider, otherOrg, 'outsider@other.example', 'Outsider',
    ]);
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
       VALUES ($1, 'account_manager', 'organisation', $2)`,
      [outsider, otherOrg],
    );
    const crossTenant = await api(base, '/directory/agencies', { email: 'outsider@other.example' });
    check('other org sees zero agencies', (crossTenant.json as unknown[]).length === 0);
    const crossProject = await api(base, `/projects/${project.id}`, { email: 'outsider@other.example' });
    check('cross-tenant project read returns nothing', (crossProject.json as unknown) === null);
  } finally {
    await app.close();
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
