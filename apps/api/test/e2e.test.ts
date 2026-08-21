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
      service_template, contact, brand, agency, role_binding, person, organisation,
      handover_item, handover_package, change_request, approval,
      notification, workstream, task, task_dependency, task_checklist, task_collaborator,
      deliverable, comment, version, qa_checklist
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

    console.log('e2e: phase 3 production workspace');
    const clientTask = await api(base, '/tasks', {
      email: 'client@test.example',
      method: 'POST',
      body: { projectId: project.id, title: 'denied' },
    });
    check('client cannot create tasks (403)', clientTask.status === 403);

    const ws = await api(base, `/tasks/${project.id}/workstreams`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { name: 'Logo' },
    });
    check('workstream created', ws.status === 201);
    const wsId = (ws.json as { id: string }).id;

    const dl = await api(base, `/deliverables/project/${project.id}`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { name: 'Primary logo', deliverableType: 'logo', workstreamId: wsId, dueDate: '2026-10-01' },
    });
    check('deliverable created', dl.status === 201);
    const dlId = (dl.json as { id: string }).id;

    const t1 = await api(base, '/tasks', {
      email: 'lead@test.example',
      method: 'POST',
      body: {
        projectId: project.id,
        title: 'Research',
        status: 'backlog',
        assigneeId: personRows.rows[0].id,
        estimateHours: 6,
        deliverableId: dlId,
      },
    });
    check('task created', t1.status === 201);
    const t1Id = (t1.json as { id: string }).id;

    const t2 = await api(base, '/tasks', {
      email: 'lead@test.example',
      method: 'POST',
      body: { projectId: project.id, title: 'Moodboards', status: 'backlog', estimateHours: 12, dueDate: '2026-09-20' },
    });
    const t2Id = (t2.json as { id: string }).id;

    const dep = await api(base, `/tasks/${t1Id}/dependencies`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { dependsOn: t2Id },
    });
    check('dependency added', dep.status === 201);

    const blocked = await api(base, `/tasks/${t1Id}`, {
      email: 'lead@test.example',
      method: 'PATCH',
      body: { status: 'done' },
    });
    check('cannot close task with unfinished dependency (400)', blocked.status === 400);

    const doneDep = await api(base, `/tasks/${t2Id}`, {
      email: 'lead@test.example',
      method: 'PATCH',
      body: { status: 'done' },
    });
    check('blocking dependency completed', doneDep.status === 200, String(doneDep.status));
    const unblocked = await api(base, `/tasks/${t1Id}`, {
      email: 'lead@test.example',
      method: 'PATCH',
      body: { status: 'done' },
    });
    check('task closes once dependency done', unblocked.status === 200, String(unblocked.status));

    const assignNotif = await api(base, '/notifications', { email: 'lead@test.example' });
    const kinds = ((assignNotif.json as { items: Array<{ kind: string }> }).items ?? []).map((n) => n.kind);
    check('assignment + status notifications emitted',
      kinds.includes('task_assigned') && kinds.includes('status_changed'));

    const cal = await api(base, `/tasks/project/${project.id}/calendar`, { email: 'lead@test.example' });
    check('calendar view returns due-dated tasks', Array.isArray(cal.json) && (cal.json as unknown[]).length >= 1);

    const board = await api(base, `/tasks/project/${project.id}`, { email: 'am@test.example' });
    check('board groups by status',
      (board.json as { columns: Record<string, unknown> }).columns !== undefined);

    console.log('e2e: comments + mentions');
    const comment = await api(base, '/comments', {
      email: 'am@test.example',
      method: 'POST',
      body: {
        targetType: 'task',
        targetId: t1Id,
        body: 'Looks good — flagging for review',
        mentions: [personRows.rows[0].id],
      },
    });
    check('comment created', comment.status === 201);
    const afterMention = await api(base, '/notifications', { email: 'lead@test.example' });
    check('mention notification delivered',
      ((afterMention.json as { items: Array<{ kind: string }> }).items ?? []).some((n) => n.kind === 'mentioned'));

    // @FirstName in body resolves to a person id without explicit mentions
    const bodyMention = await api(base, '/comments', {
      email: 'am@test.example',
      method: 'POST',
      body: {
        targetType: 'task',
        targetId: t1Id,
        body: 'second pass on this @Agency',
      },
    });
    check('@name mention resolves',
      ((bodyMention.json as { mentions: string[] }).mentions ?? []).length === 1);

    const threads = await api(base, `/comments/task/${t1Id}`, { email: 'lead@test.example' });
    check('task thread readable', Array.isArray(threads.json) && (threads.json as unknown[]).length === 2);

    console.log('e2e: workload basics');
    const time = await api(base, `/workload/tasks/${t1Id}/time`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { hours: 3.5, note: 'research pass 1' },
    });
    check('time entry logged', time.status === 201, JSON.stringify(time.json));
    const workload = await api(base, '/workload', { email: 'lead@test.example' });
    const row = (workload.json as Array<{ person_id: string; logged_hours: string }>).find(
      (w) => w.person_id === personRows.rows[0].id,
    );
    check('workload aggregates logged hours', !!row && Number(row.logged_hours) >= 3.5);
    const workloadDenied = await api(base, '/workload', { email: 'client@test.example' });
    check('client cannot read workload (403)', workloadDenied.status === 403);

    const audit = await api(base, '/audit', { email: 'ops@test.example' });
    const actions = (audit.json as Array<{ action: string }>).map((a) => a.action);
    check('audit captured conversions and status change',
      actions.includes('brief.converted_to_project') && actions.includes('project.status_changed') && actions.includes('project.role_assigned'));
    const auditDenied = await api(base, '/audit', { email: 'agency-a@test.example' });
    check('agency cannot read audit (403)', auditDenied.status === 403);

    console.log('e2e: proofing, approvals, handover');
    // Version creation is gated to creative/production leads + ops
    const v1 = await api(base, `/proofing/versions/${dlId}`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { label: 'v1', uri: 'assets/logo-v1.png', notes: 'first pass' },
    });
    check('version created', v1.status === 201);
    const v1Id = (v1.json as { id: string }).id;

    // QA checklist (quality reviewer; ops can too), gate before client review
    const qa1 = await api(base, `/proofing/versions/${v1Id}/qa`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { label: 'inks introduced', kind: 'technical' },
    });
    check('QA item added', qa1.status === 201);
    // version should be under_qa and blocked from client review until QA passes
    const early = await api(base, `/proofing/approvals/${v1Id}`, {
      email: 'am@test.example',
      method: 'POST',
      body: {},
    });
    check('approval blocked before QA passes (409)', early.status === 409);

    const qaItem = (qa1.json as { id: string }).id;
    await api(base, `/proofing/versions/${v1Id}/qa/${qaItem}`, {
      email: 'lead@test.example',
      method: 'PATCH',
      body: { passed: true, note: 'resolved' },
    });

    const approval = await api(base, `/proofing/approvals/${v1Id}`, {
      email: 'am@test.example',
      method: 'POST',
      body: { dueAt: '2026-09-30' },
    });
    check('approval requested after QA passes', approval.status === 201);
    const approvalId = (approval.json as { id: string }).id;

    // client approver rejects with changes_requested, client cannot write versions
    const clientDenied = await api(base, `/proofing/versions/${dlId}`, {
      email: 'client@test.example',
      method: 'POST',
      body: { label: 'bad', uri: 'x.png' },
    });
    check('client cannot create versions (403)', clientDenied.status === 403);

    const denied = await api(base, `/proofing/approvals/${approvalId}/decide`, {
      email: 'am@test.example',
      method: 'POST',
      body: { decision: 'approved' },
    });
    check('account manager cannot decide approval (403)', denied.status === 403);

    const rejected = await api(base, `/proofing/approvals/${approvalId}/decide`, {
      email: 'client@test.example',
      method: 'POST',
      body: { decision: 'changes_requested', note: 'lighter mark' },
    });
    check('client decides changes requested', rejected.status === 201);

    // change request proposed from rejection, accepted by AM
    const change = await api(base, `/proofing/projects/${project.id}/changes`, {
      email: 'am@test.example',
      method: 'POST',
      body: { title: 'Lighter mark revision', impactHours: 4, impactCost: 1200000, approvalId },
    });
    check('change request proposed', change.status === 201);
    const changeId = (change.json as { id: string }).id;
    const accept = await api(base, `/proofing/changes/${changeId}/decide`, {
      email: 'am@test.example',
      method: 'POST',
      body: { decision: 'accepted' },
    });
    check('change request accepted', accept.status === 200 || accept.status === 201);

    // new version approved → handover package assembled → delivered
    const v2 = await api(base, `/proofing/versions/${dlId}`, {
      email: 'lead@test.example',
      method: 'POST',
      body: { label: 'v2 — revised', uri: 'assets/logo-v2.png' },
    });
    const v2Id = (v2.json as { id: string }).id;
    const qa2 = await api(base, `/proofing/versions/${v2Id}/qa`, {
      email: 'lead@test.example', method: 'POST', body: { label: 'comp spec', kind: 'technical' },
    });
    await api(base, `/proofing/versions/${v2Id}/qa/${(qa2.json as { id: string }).id}`, {
      email: 'lead@test.example', method: 'PATCH', body: { passed: true },
    });
    const ap2 = await api(base, `/proofing/approvals/${v2Id}`, {
      email: 'am@test.example', method: 'POST', body: {},
    });
    await api(base, `/proofing/approvals/${(ap2.json as { id: string }).id}/decide`, {
      email: 'client@test.example', method: 'POST', body: { decision: 'approved', note: 'final!' },
    });

    const pkg = await api(base, `/proofing/projects/${project.id}/handover`, {
      email: 'lead@test.example', method: 'POST', body: { title: 'Logo suite — delivery' },
    });
    check('handover package created', pkg.status === 201);
    const pkgId = (pkg.json as { id: string }).id;

    // only approved versions may enter the handover package
    const earlyItem = await api(base, `/proofing/handover/${pkgId}/items`, {
      email: 'lead@test.example', method: 'POST', body: { versionId: v1Id },
    });
    check('unapproved version rejected from handover (409)', earlyItem.status === 409);
    const item = await api(base, `/proofing/handover/${pkgId}/items`, {
      email: 'lead@test.example', method: 'POST', body: { versionId: v2Id, licence: 'CC BY', sourceIncluded: true },
    });
    check('approved version enters handover', item.status === 201);
    const delivered = await api(base, `/proofing/handover/${pkgId}/status`, {
      email: 'lead@test.example', method: 'POST', body: { status: 'delivered' },
    });
    check('handover delivered', (delivered.json as { status: string }).status === 'delivered');

    // client sees the handover manifest
    const manifest = await api(base, `/proofing/projects/${project.id}/handover`, { email: 'client@test.example' });
    check('client can read handover manifest',
      !!(manifest.json as { items?: unknown[] }).items && (manifest.json as { items: unknown[] }).items.length === 1);

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
