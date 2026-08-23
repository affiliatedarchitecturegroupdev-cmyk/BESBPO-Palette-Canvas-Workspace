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
  headers?: Record<string, string>;
}

async function api(base: string, path: string, opts: ApiOptions = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.email ? { 'x-user-email': opts.email } : {}),
      ...(opts.headers ?? {}),
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
      deliverable, comment, version, qa_checklist,
      skill, person_capacity, person_skill, integration, annotation,
      sso_config, scim_identity,
      rate_card, rate_card_entry, estimate, estimate_line,
      asset, job, automation_rule, automation_run, ai_action,
      legal_hold, permission_review, role_capability_override
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

    /* ---- Phase 5/6 ---- */
    console.log('e2e: security headers');
    const sec = await fetch(`${base}/workload`, { headers: { 'x-user-email': 'lead@test.example' } });
    check('x-content-type-options nosniff', sec.headers.get('x-content-type-options') === 'nosniff');
    check('x-frame-options DENY', sec.headers.get('x-frame-options') === 'DENY');
    check('content-security-policy present', !!sec.headers.get('content-security-policy'));

    console.log('e2e: capacity planning (P6-01)');
    const leadId = (await pool.query('SELECT id FROM person WHERE email = $1', ['lead@test.example'])).rows[0].id;
    const capSet = await api(base, `/capacity/people/${leadId}`, {
      email: 'lead@test.example', method: 'POST', body: { weeklyHours: 20, thresholdPct: 80 },
    });
    check('capacity profile upserted', capSet.status === 201);
    const skill = await api(base, '/capacity/skills', {
      email: 'lead@test.example', method: 'POST', body: { name: 'digital' },
    });
    check('skill created', skill.status === 201);
    const skillId = (skill.json as { id: string }).id;
    const assign = await api(base, `/capacity/people/${leadId}/skills`, {
      email: 'lead@test.example', method: 'POST', body: { skillId, level: 4 },
    });
    check('skill assigned', assign.status === 201);
    const capList = await api(base, '/capacity', { email: 'lead@test.example' });
    const leadCap = (capList.json as Array<{ person_id: string; over_threshold: boolean; skills: unknown[] }>)
      .find((r) => r.person_id === leadId);
    check('capacity list includes person with skill', !!leadCap && leadCap.skills.length === 1);
    const coverage = await api(base, '/capacity/skills', { email: 'lead@test.example' });
    check('skill coverage reports holder', (coverage.json as Array<{ holders: number }>)[0].holders === 1);
    const capForbidden = await api(base, '/capacity', { email: 'client@test.example' });
    check('client cannot read capacity (403)', capForbidden.status === 403);

    console.log('e2e: reports (P6-02/P6-03)');
    const util = await api(base, '/reports/utilisation', { email: 'lead@test.example' });
    check('utilisation returns rows', Array.isArray(util.json));
    const effort = await api(base, '/reports/effort', { email: 'lead@test.example' });
    check('effort-by-project returns rows', Array.isArray(effort.json));
    const portfolio = await api(base, '/reports/portfolio', { email: 'lead@test.example' });
    check('portfolio roll-up returns rows', Array.isArray(portfolio.json));
    const sla = await api(base, '/reports/sla', { email: 'lead@test.example' });
    check('sla report returns rows', Array.isArray(sla.json));
    const reportsForbidden = await api(base, '/reports/portfolio', { email: 'client@test.example' });
    check('client cannot read reports (403)', reportsForbidden.status === 403);

    console.log('e2e: integrations (P6-04)');
    const integ = await api(base, '/integrations', {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'hook', targetUrl: 'https://example.test/hook', event: 'approval.decided' },
    });
    check('integration created', integ.status === 201);
    const integList = await api(base, '/integrations', { email: 'lead@test.example' });
    check('integration listed', (integList.json as unknown[]).length === 1);
    const integForbidden = await api(base, '/integrations', { email: 'client@test.example' });
    check('client cannot read integrations (403)', integForbidden.status === 403);

    console.log('e2e: richer proofing (P6-05)');
    const ann = await api(base, `/proofing/versions/${v2Id}/annotations`, {
      email: 'lead@test.example', method: 'POST', body: { x: 0.5, y: 0.5, body: 'nudge logo left' },
    });
    check('annotation created', ann.status === 201);
    const annId = (ann.json as { id: string }).id;
    const annList = await api(base, `/proofing/versions/${v2Id}/annotations`, { email: 'lead@test.example' });
    check('annotations listed', (annList.json as unknown[]).length === 1);
    const annResolve = await api(base, `/proofing/versions/${v2Id}/annotations/${annId}`, {
      email: 'lead@test.example', method: 'PATCH', body: { resolved: true },
    });
    check('annotation resolved', (annResolve.json as { resolved: boolean }).resolved === true);
    const compare = await api(base, `/proofing/deliverables/${dlId}/compare?a=${v1Id}&b=${v2Id}`, { email: 'lead@test.example' });
    const cmp = compare.json as { a: { qa_total: number }; b: { qa_total: number; open_annotations: number } };
    check('version compare returns both sides', cmp.a.qa_total >= 0 && cmp.b.qa_total >= 0);
    const annForbidden = await api(base, `/proofing/versions/${v2Id}/annotations`, {
      email: 'client@test.example', method: 'POST', body: { body: 'x' },
    });
    check('client cannot annotate (403)', annForbidden.status === 403);

    console.log('e2e: SSO/SCIM (P6-06)');
    const sso = await api(base, '/identity/sso', {
      email: 'ops@test.example', method: 'POST', body: { issuer: 'https://idp.example', clientId: 'abc', mfaRequired: true },
    });
    check('sso config upserted', sso.status === 201);
    // set a SCIM token directly, then provision a user with it
    await pool.query('UPDATE sso_config SET scim_token = $1 WHERE org_id = $2', ['tok-123', orgId]);
    const scim = await api(base, '/identity/sso/scim/users', {
      email: 'ops@test.example', method: 'POST',
      body: { externalId: 'ext-1', email: 'scimuser@test.example', name: 'Scim User', active: true },
      headers: { authorization: 'Bearer tok-123' } as never,
    });
    check('scim user provisioned with token', scim.status === 201);
    const ssoForbidden = await api(base, '/identity/sso', { email: 'lead@test.example' });
    check('production lead cannot read sso config (403)', ssoForbidden.status === 403);

    console.log('e2e: commercial controls (P6-07)');
    const card = await api(base, '/commercial/rate-cards', {
      email: 'ops@test.example', method: 'POST',
      body: { name: 'Std', currency: 'USD', entries: [{ role: 'production_lead', hourlyRate: 140 }] },
    });
    check('rate card created', card.status === 201);
    const cardForbidden = await api(base, '/commercial/rate-cards', {
      email: 'client@test.example', method: 'POST', body: { name: 'x', entries: [] },
    });
    check('client cannot create rate card (403)', cardForbidden.status === 403);
    const est1 = await api(base, `/commercial/projects/${project.id}/estimates`, {
      email: 'ops@test.example', method: 'POST',
      body: { notes: 'v1', lines: [{ label: 'Design', role: 'production_lead', hours: 12, hourlyRate: 140 }] },
    });
    check('estimate v1 created', est1.status === 201 && (est1.json as { version: number }).version === 1);
    const est2 = await api(base, `/commercial/projects/${project.id}/estimates`, {
      email: 'ops@test.example', method: 'POST',
      body: { lines: [{ label: 'Design', role: 'production_lead', hours: 12, hourlyRate: 140 }] },
    });
    check('estimate v2 supersedes', est2.status === 201 && (est2.json as { version: number }).version === 2);
    const est2Id = (est2.json as { id: string }).id;
    const approve = await api(base, `/commercial/estimates/${est2Id}/status`, {
      email: 'am@test.example', method: 'POST', body: { status: 'approved' },
    });
    check('estimate approved', approve.status === 201 && (approve.json as { status: string }).status === 'approved');
    const budgetBefore = await api(base, `/commercial/projects/${project.id}/budget`, { email: 'ops@test.example' });
    const hoursBefore = (budgetBefore.json as { logged_hours: number }).logged_hours;
    const timeLog = await api(base, `/workload/tasks/${t1Id}/time`, {
      email: 'lead@test.example', method: 'POST', body: { hours: 2, note: 'research' },
    });
    check('time logged against task', timeLog.status === 201);
    const budget = await api(base, `/commercial/projects/${project.id}/budget`, { email: 'ops@test.example' });
    const b = budget.json as { approved_amount: number; logged_hours: number; logged_value: number; blended_rate: number };
    check('budget vs effort math', budget.status === 200 && b.approved_amount === 1680 &&
      b.logged_hours === hoursBefore + 2 && b.logged_value === b.logged_hours * b.blended_rate);
    const po = await api(base, `/commercial/projects/${project.id}`, {
      email: 'am@test.example', method: 'PATCH', body: { poNumber: 'PO-1', budgetAmount: 5000 },
    });
    check('PO set on project', po.status === 200 && (po.json as { po_number: string }).po_number === 'PO-1');
    const milestoneId = (milestone.json as { id: string }).id;
    const invFlag = await api(base, `/commercial/milestones/${milestoneId}/invoice-ready`, {
      email: 'am@test.example', method: 'POST', body: { ready: true, amount: 2500 },
    });
    check('milestone flagged invoice-ready', invFlag.status === 201);
    const inv = await api(base, '/commercial/invoice-ready', { email: 'ops@test.example' });
    check('invoice-ready listing returns milestone', inv.status === 200 && (inv.json as unknown[]).length === 1);

    console.log('e2e: object storage + media workers (P6-10/P6-12)');
    // 1x1 transparent PNG
    const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const uploadForbidden = await api(base, '/assets', {
      email: 'client@test.example', method: 'POST', body: { key: 'x.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('client cannot upload asset (403)', uploadForbidden.status === 403);
    const upload = await api(base, '/assets', {
      email: 'lead@test.example', method: 'POST', body: { key: 'logo.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('asset uploaded', upload.status === 201);
    const assetId = (upload.json as { id: string }).id;
    const signed = await api(base, `/assets/${assetId}/url`, { email: 'lead@test.example' });
    const signedUrl = (signed.json as { url: string }).url;
    check('signed url issued', signed.status === 200 && signedUrl.includes('sig='));
    const download = await fetch(`${base}${signedUrl}`);
    const downloaded = Buffer.from(await download.arrayBuffer()).toString('base64');
    check('signed url round-trips bytes', download.status === 200 && downloaded === pngB64);
    const tampered = await fetch(`${base}${signedUrl.replace(/sig=.+$/, 'sig=deadbeef')}`);
    check('tampered signature rejected (403)', tampered.status === 403);
    // media pipeline: upload enqueued media.inspect — drain and verify dimensions
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    const inspected = await api(base, '/assets', { email: 'lead@test.example' });
    const meta = (inspected.json as Array<{ id: string; metadata: { media?: { width: number; height: number } } }>)
      .find((a) => a.id === assetId)?.metadata?.media;
    check('media.inspect recorded dimensions', meta?.width === 1 && meta?.height === 1);
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    const thumbJob = await pool.query(
      `SELECT status FROM job WHERE org_id = $1 AND queue = 'media.thumbnail' ORDER BY created_at DESC LIMIT 1`, [orgId]);
    const afterThumb = await api(base, '/assets', { email: 'lead@test.example' });
    const renditions = (afterThumb.json as Array<{ id: string; metadata: { renditions?: Array<{ kind: string }> } }>)
      .find((a) => a.id === assetId)?.metadata?.renditions;
    check('media.thumbnail completed with rendition', thumbJob.rows[0]?.status === 'done' &&
      !!renditions?.some((r) => r.kind === 'thumbnail'));

    console.log('e2e: worker queue + DLQ (P6-11)');
    // idempotent enqueue
    const j1 = await api(base, '/jobs', {
      email: 'ops@test.example', method: 'POST',
      body: { queue: 'webhook.deliver', payload: { targetUrl: 'http://127.0.0.1:1/hook', body: {} }, idempotencyKey: 'k1', maxAttempts: 2 },
    });
    const j2 = await api(base, '/jobs', {
      email: 'ops@test.example', method: 'POST',
      body: { queue: 'webhook.deliver', payload: { targetUrl: 'http://127.0.0.1:1/hook', body: {} }, idempotencyKey: 'k1', maxAttempts: 2 },
    });
    check('idempotent enqueue returns same job', j1.status === 201 && (j1.json as { id: string }).id === (j2.json as { id: string }).id);
    const jobId = (j1.json as { id: string }).id;
    // unreachable target: attempt 1 fails (backs off), fast-forward, attempt 2 → dead
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    await pool.query('UPDATE job SET run_at = now() WHERE id = $1', [jobId]);
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    const deadJob = await pool.query('SELECT status, attempts, last_error FROM job WHERE id = $1', [jobId]);
    check('failing job lands in DLQ after retries', deadJob.rows[0]?.status === 'dead' && deadJob.rows[0]?.attempts === 2);
    const dlq = await api(base, '/jobs/dlq', { email: 'ops@test.example' });
    check('DLQ listing contains job', (dlq.json as Array<{ id: string }>).some((j) => j.id === jobId));
    const retry = await api(base, `/jobs/${jobId}/retry`, { email: 'ops@test.example', method: 'POST' });
    check('DLQ retry requeues job', retry.status === 201 && (retry.json as { status: string }).status === 'pending');
    const jobsForbidden = await api(base, '/jobs', { email: 'client@test.example' });
    check('client cannot read jobs (403)', jobsForbidden.status === 403);

    console.log('e2e: automation builder (P6-08)');
    const rule = await api(base, '/automations', {
      email: 'ops@test.example', method: 'POST',
      body: {
        name: 'notify-on-progress', triggerEvent: 'task.status_changed',
        condition: [{ field: 'to', op: 'eq', value: 'in_progress' }],
        action: { type: 'notify', message: 'Task {taskId} started', recipientRole: 'production_lead' },
      },
    });
    check('automation rule created', rule.status === 201);
    const ruleForbidden = await api(base, '/automations', {
      email: 'client@test.example', method: 'POST',
      body: { name: 'x', triggerEvent: 'task.status_changed', action: { type: 'notify', message: 'x' } },
    });
    check('client cannot create automation (403)', ruleForbidden.status === 403);
    // non-matching event first: move t2 to done was already done earlier; move t1 to in_progress matches
    const move = await api(base, `/tasks/${t1Id}`, { email: 'lead@test.example', method: 'PATCH', body: { status: 'in_progress' } });
    check('task moved to in_progress', move.status === 200);
    const runs = await api(base, '/automations/runs', { email: 'ops@test.example' });
    const runRows = runs.json as Array<{ matched: boolean; detail: { recipients?: number } }>;
    check('automation ran with matched condition', runRows.length >= 1 &&
      runRows.some((r) => r.matched && (r.detail?.recipients ?? 0) >= 1));
    const autoInbox = await api(base, '/notifications', { email: 'lead@test.example' });
    check('automation notification delivered', (autoInbox.json as { items: Array<{ message: string }> }).items
      .some((n) => n.message.includes('started')));

    console.log('e2e: live updates over SSE (P6-09)');
    const sseAnon = await fetch(`${base}/events/stream`);
    check('anonymous event stream rejected (401)', sseAnon.status === 401);
    const sseController = new AbortController();
    const sseRes = await fetch(`${base}/events/stream`, {
      headers: { 'x-user-email': 'lead@test.example' }, signal: sseController.signal,
    });
    check('event stream opens', sseRes.status === 200);
    await api(base, `/tasks/${t1Id}`, { email: 'lead@test.example', method: 'PATCH', body: { status: 'in_review' } });
    const reader = (sseRes.body as unknown as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let sseBuf = '';
    const sseDeadline = Date.now() + 5000;
    while (Date.now() < sseDeadline && !sseBuf.includes('task.status_changed')) {
      const race = await Promise.race([
        reader.read(),
        new Promise<null>((r) => setTimeout(() => r(null), 500)),
      ]);
      if (race?.value) sseBuf += decoder.decode(race.value);
    }
    sseController.abort();
    check('sse receives task.status_changed', sseBuf.includes('task.status_changed'));

    console.log('e2e: ai opt-in guards (P6-13)');
    const aiBlocked = await api(base, '/ai/actions', {
      email: 'ops@test.example', method: 'POST',
      body: { kind: 'webhook.create', payload: { name: 'ai-hook', targetUrl: 'https://example.test/ai', event: 'approval.decided' } },
    });
    check('ai proposal blocked while opted out (403)', aiBlocked.status === 403);
    const optIn = await api(base, '/ai/opt-in', { email: 'ops@test.example', method: 'PATCH', body: { enabled: true } });
    check('ai opt-in enabled', optIn.status === 200 && (optIn.json as { enabled: boolean }).enabled === true);
    const aiProposal = await api(base, '/ai/actions', {
      email: 'ops@test.example', method: 'POST',
      body: { kind: 'webhook.create', payload: { name: 'ai-hook', targetUrl: 'https://example.test/ai', event: 'approval.decided' } },
    });
    check('ai action proposed (not executed)', aiProposal.status === 201 && (aiProposal.json as { status: string }).status === 'pending');
    const aiActionId = (aiProposal.json as { id: string }).id;
    const integBefore = await api(base, '/integrations', { email: 'lead@test.example' });
    check('no webhook created before human approval', (integBefore.json as Array<{ name: string }>).every((i) => i.name !== 'ai-hook'));
    const aiDecideForbidden = await api(base, `/ai/actions/${aiActionId}/decide`, {
      email: 'lead@test.example', method: 'POST', body: { approve: true },
    });
    check('production lead cannot decide ai action (403)', aiDecideForbidden.status === 403);
    const aiDecide = await api(base, `/ai/actions/${aiActionId}/decide`, {
      email: 'ops@test.example', method: 'POST', body: { approve: true },
    });
    check('ai action approved + executed', aiDecide.status === 201 && (aiDecide.json as { status: string }).status === 'executed');
    const integAfter = await api(base, '/integrations', { email: 'lead@test.example' });
    check('webhook created after human approval', (integAfter.json as Array<{ name: string }>).some((i) => i.name === 'ai-hook'));

    console.log('e2e: legal holds + retention (P6-14)');
    const hold = await api(base, '/legal/holds', {
      email: 'ops@test.example', method: 'POST',
      body: { scopeType: 'organisation', scopeId: orgId, reason: 'litigation' },
    });
    check('legal hold set', hold.status === 201);
    const holdId = (hold.json as { id: string }).id;
    const purgeBlocked = await api(base, '/legal/purge', { email: 'ops@test.example', method: 'POST' });
    check('purge blocked by legal hold (409)', purgeBlocked.status === 409);
    const release = await api(base, `/legal/holds/${holdId}/release`, { email: 'ops@test.example', method: 'POST' });
    check('legal hold released', release.status === 201);
    const retention = await api(base, '/legal/retention', { email: 'ops@test.example', method: 'POST', body: { days: 365 } });
    check('retention policy set', retention.status === 201 && (retention.json as { days: number }).days === 365);
    const purge = await api(base, '/legal/purge', { email: 'ops@test.example', method: 'POST' });
    check('purge runs after release', purge.status === 201);
    const legalForbidden = await api(base, '/legal/holds', { email: 'lead@test.example' });
    check('production lead cannot manage holds (403)', legalForbidden.status === 403);

    console.log('e2e: audit explorer (B-01)');
    const auditByAction = await api(base, '/audit?action=estimate.approved', { email: 'ops@test.example' });
    const auditRows = auditByAction.json as Array<{ action: string }>;
    check('audit search by action', auditRows.length >= 1 && auditRows.every((r) => r.action === 'estimate.approved'));
    const auditByText = await api(base, '/audit?q=legal_hold', { email: 'ops@test.example' });
    check('audit free-text search', (auditByText.json as Array<{ action: string }>).some((r) => r.action.includes('legal_hold')));
    const auditForbidden = await api(base, '/audit', { email: 'client@test.example' });
    check('client cannot read audit (403)', auditForbidden.status === 403);

    console.log('e2e: permissions reviews (B-02)');
    const agencyUploadBefore = await api(base, '/assets', {
      email: 'agency-a@test.example', method: 'POST', body: { key: 'a.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('agency admin lacks assets.write by default (403)', agencyUploadBefore.status === 403);
    const review = await api(base, '/permissions/reviews', {
      email: 'lead@test.example', method: 'POST',
      body: { role: 'agency_admin', capability: 'assets.write', effect: 'grant', rationale: 'pilot agency needs uploads' },
    });
    check('permission review proposed', review.status === 201);
    const reviewId = (review.json as { id: string }).id;
    // separation of duties: proposer (am) cannot decide their own review
    const ownReview = await api(base, '/permissions/reviews', {
      email: 'am@test.example', method: 'POST',
      body: { role: 'agency_admin', capability: 'assets.read', effect: 'revoke', rationale: 'sod probe' },
    });
    const ownReviewId = (ownReview.json as { id: string }).id;
    const selfDecide = await api(base, `/permissions/reviews/${ownReviewId}/decide`, {
      email: 'am@test.example', method: 'POST', body: { approve: true },
    });
    check('proposer cannot decide own review (404)', selfDecide.status === 404);
    const decide = await api(base, `/permissions/reviews/${reviewId}/decide`, {
      email: 'am@test.example', method: 'POST', body: { approve: true },
    });
    check('review approved by second person', decide.status === 201 && (decide.json as { status: string }).status === 'approved');
    const agencyUploadAfter = await api(base, '/assets', {
      email: 'agency-a@test.example', method: 'POST', body: { key: 'a.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('approved grant takes effect (201)', agencyUploadAfter.status === 201);
    const revoke = await api(base, '/permissions/reviews', {
      email: 'lead@test.example', method: 'POST',
      body: { role: 'agency_admin', capability: 'assets.write', effect: 'revoke', rationale: 'pilot ended' },
    });
    const revokeId = (revoke.json as { id: string }).id;
    await api(base, `/permissions/reviews/${revokeId}/decide`, { email: 'am@test.example', method: 'POST', body: { approve: true } });
    const agencyUploadRevoked = await api(base, '/assets', {
      email: 'agency-a@test.example', method: 'POST', body: { key: 'b.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('approved revoke takes effect (403)', agencyUploadRevoked.status === 403);
  } finally {
    await app.close();
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
