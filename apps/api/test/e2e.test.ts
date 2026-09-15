import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { migrate } from '../src/db/migrate';
import { DATABASE_URL, migrationsDir } from '../src/db/paths';
import { totp } from '../src/identity/totp';

// Drive the worker queue exclusively via POST /jobs/process below. The 2s
// background poller otherwise races the explicit drains (backoff fast-forward
// in P6-11, media inspections, reminder delivery), making e2e timing-flaky.
process.env.PC_QUEUE_POLL = '0';

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
  const setCookie = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')].filter(Boolean);
  return { status: res.status, json, headers: { ...Object.fromEntries(res.headers), 'set-cookie': setCookie } };
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
      legal_hold, permission_review, role_capability_override,
      api_key, esign_envelope, session, email_outbox,
      agent_run, dashboard_metric, dashboard_widget, dashboard,
      meeting_participant, meeting, message, channel_member, channel,
      item_file, file_object,
      guest_link, compliance_check, subitem, subitem_column, board_view,
      item, board_group, board_column, board, workspace, engagement
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
    const commentId = (comment.json as { id: string }).id;
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
    // rule evaluation runs asynchronously off the in-process event bus; poll
    // briefly so the assertion sees the matched run instead of racing it.
    const matchedDeadline = Date.now() + 3000;
    let runRows: Array<{ matched: boolean; detail: { recipients?: number } }> = [];
    while (Date.now() < matchedDeadline) {
      const runs = await api(base, '/automations/runs', { email: 'ops@test.example' });
      runRows = runs.json as Array<{ matched: boolean; detail: { recipients?: number } }>;
      if (runRows.some((r) => r.matched && (r.detail?.recipients ?? 0) >= 1)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    check('automation ran with matched condition', runRows.length >= 1 &&
      runRows.some((r) => r.matched && (r.detail?.recipients ?? 0) >= 1));
    // notification emission happens inside the same async evaluation — poll the
    // inbox until the message lands.
    const notifyDeadline = Date.now() + 3000;
    let autoInboxItems: Array<{ message: string }> = [];
    while (Date.now() < notifyDeadline) {
      const autoInbox = await api(base, '/notifications', { email: 'lead@test.example' });
      autoInboxItems = (autoInbox.json as { items: Array<{ message: string }> }).items;
      if (autoInboxItems.some((n) => n.message.includes('started'))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    check('automation notification delivered', autoInboxItems.some((n) => n.message.includes('started')));

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

    console.log('e2e: agent-attribution audit (B-03)');
    const agentWrite = await api(base, `/tasks/${t1Id}`, {
      email: 'lead@test.example', method: 'PATCH', body: { status: 'in_progress' },
      headers: { 'x-agent-tag': 'openhands-e2e' },
    });
    check('agent-tagged write accepted', agentWrite.status === 200);
    const tagged = await api(base, '/audit?agent=openhands-e2e', { email: 'ops@test.example' });
    const taggedRows = tagged.json as Array<{ agent_tag: string | null }>;
    check('audit rows carry agent_tag', taggedRows.length >= 1 &&
      taggedRows.every((r) => r.agent_tag === 'openhands-e2e'));
    const allAudit = await api(base, '/audit', { email: 'ops@test.example' });
    check('untagged writes have null agent_tag',
      (allAudit.json as Array<{ agent_tag: string | null }>).some((r) => r.agent_tag === null));

    console.log('e2e: MFA TOTP (P7-01)');
    const enroll = await api(base, '/identity/mfa/enroll', { email: 'lead@test.example', method: 'POST' });
    const mfaSecret = (enroll.json as { secret: string }).secret;
    check('mfa enroll returns secret', enroll.status === 201 && typeof mfaSecret === 'string' && mfaSecret.length >= 16);
    const badActivate = await api(base, '/identity/mfa/activate', {
      email: 'lead@test.example', method: 'POST', body: { code: '000000' },
    });
    check('wrong TOTP rejected (401)', badActivate.status === 401);
    const activate = await api(base, '/identity/mfa/activate', {
      email: 'lead@test.example', method: 'POST', body: { code: totp(mfaSecret) },
    });
    check('mfa activated with valid TOTP', activate.status === 201 && (activate.json as { enabled: boolean }).enabled);
    const mfaStatus = await api(base, '/identity/mfa/status', { email: 'lead@test.example' });
    check('mfa status enabled', (mfaStatus.json as { enabled: boolean }).enabled === true);
    const verify = await api(base, '/identity/mfa/verify', {
      email: 'lead@test.example', method: 'POST', body: { code: totp(mfaSecret) },
    });
    check('mfa verify ok', verify.status === 201 && (verify.json as { valid: boolean }).valid);

    console.log('e2e: OIDC login flow (P7-02)');
    const ssoCfgs = await api(base, '/identity/sso', { email: 'ops@test.example' });
    const cfgId = (ssoCfgs.json as Array<{ id: string }>)[0].id;
    const authz = await api(base, `/identity/sso/${cfgId}/authorize`, { email: 'ops@test.example' });
    const state = (authz.json as { state: string }).state;
    check('authorize url carries signed state', authz.status === 200 &&
      (authz.json as { url: string }).url.includes('/authorize?') && state.includes('.'));
    const badState = state.slice(0, -2) + (state.endsWith('aa') ? 'bb' : 'aa');
    const tamperedState = await api(base, '/identity/sso/token', {
      method: 'POST', body: { configId: cfgId, state: badState, code: 'stub:lead@test.example' },
    });
    check('tampered state rejected (401)', tamperedState.status === 401);
    const exchange = await api(base, '/identity/sso/token', {
      method: 'POST', body: { configId: cfgId, state, code: 'stub:lead@test.example' },
    });
    check('code exchange resolves person', exchange.status === 201 &&
      (exchange.json as { email: string }).email === 'lead@test.example');
    const unprovisioned = await api(base, '/identity/sso/token', {
      method: 'POST', body: { configId: cfgId, state, code: 'stub:ghost@test.example' },
    });
    check('unprovisioned person rejected (401)', unprovisioned.status === 401);

    console.log('e2e: scheduled reminders (P7-03)');
    const reminder = await api(base, '/notifications/reminders', {
      email: 'lead@test.example', method: 'POST', body: { message: 'check the board', delayMinutes: 0 },
    });
    check('reminder scheduled', reminder.status === 201 && typeof (reminder.json as { jobId: string }).jobId === 'string');
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    const inboxAfterReminder = await api(base, '/notifications', { email: 'lead@test.example' });
    check('reminder delivered', (inboxAfterReminder.json as { items: Array<{ kind: string; message: string }> }).items
      .some((n) => n.kind === 'reminder' && n.message === 'check the board'));

    console.log('e2e: API keys (P7-04)');
    const keyCreate = await api(base, '/identity/api-keys', {
      email: 'ops@test.example', method: 'POST', body: { name: 'ci-bot' },
    });
    const apiToken = (keyCreate.json as { token: string }).token;
    check('api key created with token shown once', keyCreate.status === 201 && apiToken.startsWith('pck_'));
    const keyList = await api(base, '/identity/api-keys', { email: 'ops@test.example' });
    const keyRows = keyList.json as Array<{ id: string; hash?: string }>;
    check('api key listed without hash', keyList.status === 200 && keyRows.length >= 1 &&
      keyRows.every((k) => k.hash === undefined));
    const viaKey = await fetch(`${base}/notifications`, { headers: { 'x-api-key': apiToken } });
    check('x-api-key authenticates (200)', viaKey.status === 200);
    const keyId = keyRows[0].id;
    const revokeKey = await api(base, `/identity/api-keys/${keyId}`, { email: 'ops@test.example', method: 'DELETE' });
    check('api key revoked', revokeKey.status === 200 && (revokeKey.json as { revoked_at: string | null }).revoked_at !== null);
    const viaRevoked = await fetch(`${base}/notifications`, { headers: { 'x-api-key': apiToken } });
    check('revoked key rejected (401)', viaRevoked.status === 401);
    const keyForbidden = await api(base, '/identity/api-keys', { email: 'lead@test.example', method: 'POST', body: { name: 'x' } });
    check('lead cannot manage api keys (403)', keyForbidden.status === 403);

    console.log('e2e: e-sign stub (P7-05)');
    const envelope = await api(base, `/proofing/approvals/${approvalId}/esign`, {
      email: 'am@test.example', method: 'POST',
    });
    const envelopeId = (envelope.json as { id: string }).id;
    check('esign envelope sent', envelope.status === 201 && (envelope.json as { status: string }).status === 'sent');
    const latest = await api(base, `/proofing/approvals/${approvalId}/esign`, { email: 'am@test.example' });
    check('envelope retrievable', latest.status === 200 && (latest.json as { id: string }).id === envelopeId);
    const completed = await api(base, `/proofing/esign/${envelopeId}/complete`, {
      email: 'client@test.example', method: 'POST',
    });
    check('envelope completed by signer role', completed.status === 201 && (completed.json as { status: string }).status === 'completed');
    const completeForbidden = await api(base, `/proofing/esign/${envelopeId}/complete`, {
      email: 'lead@test.example', method: 'POST',
    });
    check('lead cannot complete envelope (403)', completeForbidden.status === 403);

    console.log('e2e: integration health (P7-06)');
    // trigger an approval decision so webhook.deliver jobs are enqueued per integration
    const approval2 = await api(base, `/proofing/approvals/${v2Id}`, { email: 'am@test.example', method: 'POST', body: {} });
    const approval2Id = (approval2.json as { id: string }).id;
    await api(base, `/proofing/approvals/${approval2Id}/decide`, {
      email: 'client@test.example', method: 'POST', body: { decision: 'approved' },
    });
    await api(base, '/jobs/process', { email: 'ops@test.example', method: 'POST', body: {} });
    const health = await api(base, '/integrations/health', { email: 'ops@test.example' });
    const healthRows = health.json as Array<{ name: string; deliveries: number; last_status: string | null }>;
    check('integration health aggregates deliveries', health.status === 200 && healthRows.length >= 1 &&
      healthRows.some((r) => r.deliveries >= 1 && r.last_status !== null));

    console.log('e2e: account health (B-06)');
    const acctHealth = await api(base, '/reports/account-health', { email: 'ops@test.example' });
    const acctRows = acctHealth.json as Array<{ agency_name: string; projects: number; tasks_completed: number }>;
    check('account health roll-up', acctHealth.status === 200 && acctRows.length >= 1 &&
      acctRows.some((r) => r.projects >= 1));

    /* ---- Phase 8: P8-01..P8-15 ---- */
    console.log('e2e: invites (P8-01)');
    const invite = await api(base, '/invites', {
      email: 'ops@test.example', method: 'POST',
      body: { email: 'newcomer@test.example', role: 'creative_contributor', scopeType: 'organisation', scopeId: orgId },
    });
    check('invite created', invite.status === 201);
    const tok = (invite.json as { token: string }).token;
    check('invite carries single-use token', typeof tok === 'string' && tok.length >= 20);
    const inviteList = await api(base, '/invites', { email: 'ops@test.example' });
    check('invite listed', (inviteList.json as unknown[]).length >= 1);
    const inviteForbidden = await api(base, '/invites', { email: 'client@test.example', method: 'POST', body: { email: 'x@test.example', role: 'creative_contributor', scopeType: 'organisation', scopeId: orgId } });
    check('client cannot manage invites (403)', inviteForbidden.status === 403);
    const inviteAccepted = await api(base, '/invites/accept', {
      email: 'newcomer@test.example', method: 'POST',
      body: { token: tok, name: 'New Comer' },
    });
    check('invite accepted by newcomer', inviteAccepted.status === 200 || inviteAccepted.status === 201);

    console.log('e2e: version confidentiality (P8-02)');
    const conf = await api(base, `/proofing/versions/${v1Id}/confidentiality`, {
      email: 'ops@test.example', method: 'PATCH', body: { confidentiality: 'internal' },
    });
    check('confidentiality set by ops', conf.status === 200 && (conf.json as { confidentiality: string }).confidentiality === 'internal');
    const confForbidden = await api(base, `/proofing/versions/${v1Id}/confidentiality`, {
      email: 'client@test.example', method: 'PATCH', body: { confidentiality: 'internal' },
    });
    check('client cannot set confidentiality (403)', confForbidden.status === 403);
    const versionsOps = await api(base, `/proofing/versions/${dlId}`, { email: 'ops@test.example' });
    check('internal role sees internal version', (versionsOps.json as unknown[]).some((v: { confidentiality: string }) => v.confidentiality === 'internal'));
    const versionsClient = await api(base, `/proofing/versions/${dlId}`, { email: 'client@test.example' });
    check('external client hides internal version', !(versionsClient.json as unknown[]).some((v: { confidentiality: string }) => v.confidentiality === 'internal'));

    console.log('e2e: exports (P8-03)');
    const exportRec = await api(base, '/exports', {
      email: 'ops@test.example', method: 'POST', body: { kind: 'tasks', format: 'csv', rowCount: 42 },
    });
    check('export recorded', exportRec.status === 201);
    const exportList = await api(base, '/exports', { email: 'ops@test.example' });
    check('exports listed', (exportList.json as unknown[]).length >= 1);
    const exportForbidden = await api(base, '/exports', { email: 'client@test.example', method: 'POST', body: { kind: 'tasks', format: 'xlsx' } });
    check('client cannot record exports (403)', exportForbidden.status === 403);

    console.log('e2e: risk register (P8-04)');
    const risk = await api(base, `/projects/${project.id}/risks`, {
      email: 'lead@test.example', method: 'POST',
      body: { title: 'Talent slippage', severity: 'high' },
    });
    check('risk created', risk.status === 201);
    const riskId = (risk.json as { id: string }).id;
    const riskPatch = await api(base, `/projects/${project.id}/risks/${riskId}`, {
      email: 'am@test.example', method: 'PATCH', body: { status: 'mitigated' },
    });
    check('risk mitigated by AM', riskPatch.status === 200 && (riskPatch.json as { status: string }).status === 'mitigated');
    const riskList = await api(base, `/projects/${project.id}/risks`, { email: 'lead@test.example' });
    check('risk listed', (riskList.json as unknown[]).length === 1);
    const riskForbidden = await api(base, `/projects/${project.id}/risks`, { email: 'client@test.example', method: 'POST', body: { title: 'nope' } });
    check('client cannot create risk (403)', riskForbidden.status === 403);

    console.log('e2e: reaction + assets (P8-05/P8-06)');
    const re = await api(base, `/comments/${commentId}/reactions`, {
      email: 'am@test.example', method: 'POST', body: { emoji: 'heart' },
    });
    check('reaction added', re.status === 201);
    const reList = await api(base, `/comments/${commentId}/reactions`, { email: 'am@test.example' });
    check('reaction listed', (reList.json as unknown[]).length >= 1);
    const reRemove = await api(base, `/comments/${commentId}/reactions/heart`, {
      email: 'am@test.example', method: 'DELETE',
    });
    check('reaction removed', reRemove.status === 200, String(reRemove.status));
    const reForbidden = await api(base, `/comments/${commentId}/reactions`, { email: 'agency-a@test.example', method: 'POST', body: { emoji: 'heart' } });
    check('agency cannot add reactions (403)', reForbidden.status === 403);
    const cmtAsset = await api(base, '/assets', {
      email: 'lead@test.example', method: 'POST',
      body: { key: 'logo-raw.png', contentType: 'image/png', dataBase64: pngB64 },
    });
    check('asset created', cmtAsset.status === 201);
    const cmtAssetId = (cmtAsset.json as { id: string }).id;
    const attach = await api(base, `/comments/${commentId}/assets`, {
      email: 'am@test.example', method: 'POST', body: { assetId: cmtAssetId },
    });
    check('asset attached to comment', attach.status === 201);
    const detach = await api(base, `/comments/${commentId}/assets/${cmtAssetId}`, {
      email: 'am@test.example', method: 'DELETE',
    });
    check('asset detached', detach.status === 200, String(detach.status));
    const attachForbidden = await api(base, `/comments/${commentId}/assets`, { email: 'client@test.example', method: 'POST', body: { assetId: cmtAssetId } });
    check('client cannot attach assets (403)', attachForbidden.status === 403);

    console.log('e2e: message-to-task (P8-07)');
    const projectComment = await api(base, '/comments', {
      email: 'am@test.example', method: 'POST',
      body: { targetType: 'project', targetId: project.id, body: 'meeting note worth a task' },
    });
    check('project comment created', projectComment.status === 201);
    const projectCommentId = (projectComment.json as { id: string }).id;
    const mt = await api(base, `/comments/${projectCommentId}/to-task`, {
      email: 'am@test.example', method: 'POST', body: { projectId: project.id },
    });
    check('comment converted to task', mt.status === 201);
    const mtForbidden = await api(base, `/comments/${projectCommentId}/to-task`, { email: 'client@test.example', method: 'POST', body: { projectId: project.id } });
    check('client cannot convert comment to task (403)', mtForbidden.status === 403);

    console.log('e2e: approval steps (P8-08)');
    const step = await api(base, '/approval-steps', {
      email: 'am@test.example', method: 'POST',
      body: { projectId: project.id, name: 'Brand sign-off' },
    });
    check('approval step created', step.status === 201);
    const stepId = (step.json as { id: string }).id;
    const stepComplete = await api(base, `/approval-steps/${stepId}/complete`, {
      email: 'am@test.example', method: 'POST', body: {},
    });
    check('approval step completed', stepComplete.status === 200 || stepComplete.status === 201, String(stepComplete.status));
    const stepProgress = await api(base, `/approval-steps/progress?projectId=${project.id}`, { email: 'lead@test.example' });
    check('approval step progress readable', stepProgress.status === 200 && typeof stepProgress.json === 'object');
    const stepForbidden = await api(base, '/approval-steps', { email: 'client@test.example', method: 'POST', body: { projectId: project.id, name: 'x' } });
    check('client cannot manage approval steps (403)', stepForbidden.status === 403);

    console.log('e2e: technical checks (P8-09)');
    const tc = await api(base, `/proofing/versions/${v2Id}/technical-checks`, {
      email: 'ops@test.example', method: 'POST', body: { name: 'resolution', passed: true },
    });
    check('technical check recorded', tc.status === 201);
    const tcList = await api(base, `/proofing/versions/${v2Id}/technical-checks`, { email: 'lead@test.example' });
    check('technical checks readable', Array.isArray(tcList.json));
    const tcForbidden = await api(base, `/proofing/versions/${v2Id}/technical-checks`, { email: 'client@test.example', method: 'POST', body: { name: 'x', passed: true } });
    check('client cannot run technical checks (403)', tcForbidden.status === 403);

    console.log('e2e: qa reviewers (P8-10)');
    const qr = await api(base, `/proofing/versions/${v2Id}/qa-reviewers`, {
      email: 'lead@test.example', method: 'POST',
      body: { reviewerId: personRows.rows[0].id },
    });
    check('qa reviewer assigned', qr.status === 201);
    const qrList = await api(base, `/proofing/versions/${v2Id}/qa-reviewers`, { email: 'lead@test.example' });
    check('qa reviewers listed', Array.isArray(qrList.json));
    const qrForbidden = await api(base, `/proofing/versions/${v2Id}/qa-reviewers`, { email: 'client@test.example', method: 'POST', body: { reviewerId: personRows.rows[0].id } });
    check('client cannot assign qa reviewer (403)', qrForbidden.status === 403);

    console.log('e2e: recurrence (P8-11)');
    const rec = await api(base, '/recurrences', {
      email: 'am@test.example', method: 'POST',
      body: { projectId: project.id, cadence: 'weekly' },
    });
    check('recurrence rule created', rec.status === 201);
    const recId = (rec.json as { id: string }).id;
    const recTick = await api(base, `/recurrences/${recId}/tick`, { email: 'am@test.example', method: 'POST', body: {} });
    check('recurrence tick spawns tasks', recTick.status === 200 || recTick.status === 201, String(recTick.status));
    const recOff = await api(base, `/recurrences/${recId}/active`, { email: 'am@test.example', method: 'POST', body: { active: false } });
    check('recurrence deactivated', (recOff.status === 200 || recOff.status === 201) && (recOff.json as { active: boolean }).active === false, String((recOff.json as { active: boolean }).active));
    const recForbidden = await api(base, '/recurrences', { email: 'client@test.example', method: 'POST', body: { projectId: project.id } });
    check('client cannot manage recurrence (403)', recForbidden.status === 403);

    console.log('e2e: saved views (P8-14)');
    const view = await api(base, '/views', {
      email: 'am@test.example', method: 'POST',
      body: { projectId: project.id, name: 'My board', kind: 'board', filters: { status: ['in_progress'] } },
    });
    check('saved view created', view.status === 201);
    const viewPatch = await api(base, `/views/${(view.json as { id: string }).id}`, {
      email: 'am@test.example', method: 'PATCH', body: { shared: true },
    });
    check('saved view patched', viewPatch.status === 200);
    const viewList = await api(base, `/views?projectId=${project.id}`, { email: 'am@test.example' });
    check('saved view listed', (viewList.json as unknown[]).length >= 1);
    const viewForbidden = await api(base, '/views', { email: 'client@test.example', method: 'POST', body: { projectId: project.id, name: 'x' } });
    check('client cannot create saved view (403)', viewForbidden.status === 403);

    console.log('e2e: template schemas (P8-13)');
    const tpl = await api(base, '/template-schemas', {
      email: 'ops@test.example', method: 'POST',
      body: { workstreamId: wsId, name: 'Logo brief', schema: { sections: ['overview'] } },
    });
    check('template schema created', tpl.status === 201);
    const tplList = await api(base, `/template-schemas?workstreamId=${wsId}`, { email: 'ops@test.example' });
    check('template schemas listed for workstream', (tplList.json as unknown[]).length === 1);
    const tplForbidden = await api(base, '/template-schemas', { email: 'lead@test.example', method: 'POST', body: { workstreamId: wsId, name: 'x', schema: {} } });
    check('lead cannot manage template schemas (403)', tplForbidden.status === 403);

    console.log('e2e: comments visibility internal (P8-14)');
    const internalComment = await api(base, '/comments', {
      email: 'lead@test.example', method: 'POST',
      body: { targetType: 'task', targetId: t1Id, body: 'internal note — do not share', visibility: 'internal' },
    });
    check('internal comment created', internalComment.status === 201);
    const threadInternal = await api(base, `/comments/task/${t1Id}`, { email: 'ops@test.example' });
    check('internal role sees internal comment', (threadInternal.json as unknown[]).some((c: { body: string }) => c.body.includes('internal note')));
    const threadExternal = await api(base, `/comments/task/${t1Id}`, { email: 'client@test.example' });
    check('external client hides internal comment', !(threadExternal.json as unknown[]).some((c: { body: string }) => c.body.includes('internal note')));

    console.log('e2e: reports deep-dive (P8-15)');
    const deep = await api(base, '/reports/deep-dive', { email: 'ops@test.example' });
    check('deep-dive report rolls up per workspace', deep.status === 200 && Array.isArray(deep.json));
    const deepForbidden = await api(base, '/reports/deep-dive', { email: 'client@test.example' });
    check('client cannot read deep-dive (403)', deepForbidden.status === 403);
    const acctForbidden = await api(base, '/reports/account-health', { email: 'client@test.example' });
    check('client cannot read account health (403)', acctForbidden.status === 403);

    console.log('e2e: authN core + sign-up/bootstrap (A-01)');
    // B-1: signup creates org + owner (agency_admin) + starter templates.
    const signup = await api(base, '/auth/signup', {
      method: 'POST',
      body: {
        slug: 'design-studio',
        orgName: 'Design Studio',
        ownerName: 'Ada Signup',
        ownerEmail: 'ada@signup.example',
        password: 'correct-horse-9',
        confirmPassword: 'correct-horse-9',
      },
    });
    check('signup creates org (201)', signup.status === 201);
    const signupJson = signup.json as { org?: { slug?: string }; person?: { email?: string } };
    check('signup returns org slug', signupJson.org?.slug === 'design-studio');
    check('signup returns owner person', signupJson.person?.email === 'ada@signup.example');
    const orgRows = await pool.query<{ status: string; plan_tier: string; owner_person_id: string | null }>(
      `SELECT status, plan_tier, owner_person_id FROM organisation WHERE slug = 'design-studio'`,
    );
    check('org seeded with trial status + free plan + owner', orgRows.rows.length === 1 &&
      orgRows.rows[0].status === 'trial' && orgRows.rows[0].plan_tier === 'free' && !!orgRows.rows[0].owner_person_id);
    const ownerBinding = await pool.query<{ role: string }>(
      `SELECT rb.role FROM role_binding rb JOIN person p ON p.id = rb.person_id WHERE p.email = 'ada@signup.example'`,
    );
    check('owner has agency_admin role binding', ownerBinding.rows.length === 1 && ownerBinding.rows[0].role === 'agency_admin');
    const signupOrgId = (await pool.query<{ org_id: string }>(`SELECT org_id FROM person WHERE email = 'ada@signup.example'`)).rows[0].org_id;
    const starterTemplates = await pool.query<{ key: string }>(
      `SELECT key FROM service_template WHERE org_id = $1 ORDER BY key`,
      [signupOrgId],
    );
    check('starter template pack seeded', starterTemplates.rows.length === 2 && starterTemplates.rows.some((t) => t.key === 'brand_identity'));
    const outbox = await pool.query<{ kind: string; token_hash: string | null }>(
      `SELECT kind, token_hash FROM email_outbox WHERE recipient = 'ada@signup.example'`,
    );
    check('verification outbox row created', outbox.rows.length === 1 && outbox.rows[0].kind === 'signup.verify');
    // A-01: duplicate email and duplicate slug are both rejected.
    const dupEmail = await api(base, '/auth/signup', {
      method: 'POST',
      body: { slug: 'other-studio', orgName: 'Other', ownerName: 'X', ownerEmail: 'ada@signup.example', password: 'correct-horse-9', confirmPassword: 'correct-horse-9' },
    });
    check('duplicate email rejected (409)', dupEmail.status === 409);
    const dupSlug = await api(base, '/auth/signup', {
      method: 'POST',
      body: { slug: 'design-studio', orgName: 'Other', ownerName: 'Y', ownerEmail: 'other@signup.example', password: 'correct-horse-9', confirmPassword: 'correct-horse-9' },
    });
    check('duplicate slug rejected (409)', dupSlug.status === 409);
    const badEmail = await api(base, '/auth/signup', {
      method: 'POST',
      body: { slug: 'bad', orgName: 'Bad', ownerName: 'Z', ownerEmail: 'not-an-email', password: 'correct-horse-9', confirmPassword: 'correct-horse-9' },
    });
    check('bad email rejected (422-class 400)', badEmail.status === 400);
    const weakPassword = await api(base, '/auth/signup', {
      method: 'POST',
      body: { slug: 'weak', orgName: 'Weak', ownerName: 'W', ownerEmail: 'weak@signup.example', password: 'short', confirmPassword: 'short' },
    });
    check('weak password rejected (400)', weakPassword.status === 400);
    // No plaintext password at rest (argon2id hash).
    const storedHash = await pool.query<{ password_hash: string | null }>(
      `SELECT password_hash FROM person WHERE email = 'ada@signup.example'`,
    );
    check('password stored as argon2id hash', !!storedHash.rows[0].password_hash &&
      storedHash.rows[0].password_hash!.startsWith('$argon2id$') && !storedHash.rows[0].password_hash!.includes('correct-horse-9'));

    // AuthN core: verify token → login → session → logout.
    const rawVerifyToken = 'test-verify-token-does-not-exist';
    const authVerify = await api(base, '/auth/verify', { method: 'POST', body: { token: rawVerifyToken } });
    check('wrong verification token rejected (401)', authVerify.status === 401);

    // Grab the real verification token from the outbox body.
    const outboxBody = await pool.query<{ body: string | null }>(
      `SELECT body FROM email_outbox WHERE recipient = 'ada@signup.example'`,
    );
    const realToken = outboxBody.rows[0].body!.replace('Verify: ', '');
    const verifyOk = await api(base, '/auth/verify', { method: 'POST', body: { token: realToken } });
    check('verification token flips verified (200)', verifyOk.status === 200);
    const verifiedAt = await pool.query<{ verified_at: Date | null }>(
      `SELECT verified_at FROM person WHERE email = 'ada@signup.example'`,
    );
    check('person.verified_at set', !!verifiedAt.rows[0].verified_at);
    const verifyReuse = await api(base, '/auth/verify', { method: 'POST', body: { token: realToken } });
    check('verification token single-use (410 on reuse)', verifyReuse.status === 410);

    // Login: wrong password 401, correct password → session cookie.
    const wrongLogin = await api(base, '/auth/login', { method: 'POST', body: { email: 'ada@signup.example', password: 'wrong-password-1' } });
    check('wrong password rejected (401)', wrongLogin.status === 401);
    const login = await api(base, '/auth/login', { method: 'POST', body: { email: 'ada@signup.example', password: 'correct-horse-9' } });
    check('correct password logs in (201)', login.status === 201);
    const setCookie = login.headers?.['set-cookie'] as unknown as string[] | undefined;
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : undefined;
    check('login issues httpOnly session cookie', typeof cookieHeader === 'string' && cookieHeader.includes('pc_session=') && cookieHeader.includes('HttpOnly'));
    const cookieStr = (cookieHeader ?? '').split(';')[0] ?? '';
    const sessionCheck = await api(base, '/auth/session', { headers: { cookie: cookieStr } });
    check('session resolves authenticated user', sessionCheck.status === 200 &&
      (sessionCheck.json as { authenticated?: boolean }).authenticated === true);
    const sessionJson = sessionCheck.json as { roles?: string[]; person?: { email?: string } };
    check('session includes owner role + identity', sessionJson.roles?.includes('agency_admin') && sessionJson.person?.email === 'ada@signup.example');

    // Logout revokes the session server-side.
    const logout = await api(base, '/auth/logout', { method: 'POST', headers: { cookie: cookieStr } });
    check('logout succeeds (201)', logout.status === 201);
    const sessionAfterLogout = await api(base, '/auth/session', { headers: { cookie: cookieStr } });
    check('revoked session no longer authenticates', (sessionAfterLogout.json as { authenticated?: boolean }).authenticated !== true);
    const sessionRow = await pool.query<{ status: string }>(
      `SELECT status FROM session WHERE person_id = (SELECT id FROM person WHERE email = 'ada@signup.example') ORDER BY created_at DESC LIMIT 1`,
    );
    check('session row marked revoked server-side', sessionRow.rows.length === 1 && sessionRow.rows[0].status === 'revoked');

    // Merge master hash into session table then test expiry path.
    await pool.query(`UPDATE session SET expires_at = now() - interval '1 minute' WHERE status = 'revoked'`);
    const expiredCookieCheck = await api(base, '/auth/session', { headers: { cookie: cookieStr } });
    check('expired session rejected', (expiredCookieCheck.json as { authenticated?: boolean }).authenticated !== true);

    // Password hash being a raw argon2id also means the /identity/me dev path still resolves the new person.
    const devIdentity = await api(base, '/identity/me', { email: 'ada@signup.example' });
    check('existing dev-auth identity resolves new signup', devIdentity.status === 200);

    // All auth events below are audited for the new org.
    const authAudit = await pool.query<{ action: string }>(
      `SELECT action FROM audit_event WHERE org_id = (SELECT org_id FROM person WHERE email = 'ada@signup.example') ORDER BY at`,
    );
    const authActions = authAudit.rows.map((r) => r.action);
    check('auth lifecycle audited', authActions.includes('auth.signed_up') && authActions.includes('auth.logged_in') && authActions.includes('auth.logged_out'));

    /* ================================================================== */
    /* N1: email transport seam (§0.2) + A-02/A-03 hardening.              */
    /* ================================================================== */

    console.log('\n-- N1: mail transport + credential hardening');

    // N1.1: with no provider configured, status reports the outbox fallback
    // and signup still succeeds — the send is recorded, not delivered.
    const emailStatus = await api(base, '/email/status');
    check('email status exposes transport + deliverability', emailStatus.status === 200 &&
      (emailStatus.json as { transport?: string }).transport === 'outbox' &&
      (emailStatus.json as { deliverable?: boolean }).deliverable === false);

    const outboxSend = await pool.query<{ send_attempts: number; delivered_at: Date | null; transport: string | null; expires_at: Date | null }>(
      `SELECT send_attempts, delivered_at, transport, expires_at FROM email_outbox WHERE recipient = 'ada@signup.example'`,
    );
    check('undeliverable send is recorded with attempts + reason', outboxSend.rows.length === 1 &&
      outboxSend.rows[0].send_attempts >= 1 && outboxSend.rows[0].delivered_at === null &&
      outboxSend.rows[0].transport === 'outbox');
    check('credential token carries an expiry', !!outboxSend.rows[0].expires_at);

    // N1.2: an unverified account cannot log in, but the password was right,
    // so it is a 403 (usable-account problem) not a 401 (credential problem).
    const unverified = await api(base, '/auth/signup', {
      method: 'POST',
      body: {
        slug: 'unverified-studio', orgName: 'Unverified Studio', ownerName: 'Una Verified',
        ownerEmail: 'unverified@signup.example', password: 'correct-horse-9', confirmPassword: 'correct-horse-9',
      },
    });
    check('second org signs up (201)', unverified.status === 201);
    const unverifiedLogin = await api(base, '/auth/login', {
      method: 'POST', body: { email: 'unverified@signup.example', password: 'correct-horse-9' },
    });
    check('unverified login rejected (403, not 401)', unverifiedLogin.status === 403);

    // Resend is throttled inside the window: the fresh signup row is seconds old.
    const resend = await api(base, '/auth/verify/resend', {
      method: 'POST', body: { email: 'unverified@signup.example' },
    });
    check('resend inside throttle window is refused', resend.status === 200 &&
      (resend.json as { throttled?: boolean }).throttled === true);
    const resendUnknown = await api(base, '/auth/verify/resend', {
      method: 'POST', body: { email: 'nobody@nowhere.example' },
    });
    check('resend for unknown address does not disclose existence', resendUnknown.status === 200 &&
      (resendUnknown.json as { sent?: boolean }).sent === false);

    // Expired verification token → 410.
    await pool.query(
      `UPDATE email_outbox SET expires_at = now() - interval '1 hour' WHERE recipient = 'unverified@signup.example'`,
    );
    const expiredRow = await pool.query<{ body: string | null }>(
      `SELECT body FROM email_outbox WHERE recipient = 'unverified@signup.example'`,
    );
    const expiredToken = expiredRow.rows[0].body!.replace('Verify: ', '');
    const expiredVerify = await api(base, '/auth/verify', { method: 'POST', body: { token: expiredToken } });
    check('expired verification token rejected (410)', expiredVerify.status === 410);

    // N1.3: password reset round-trip. Request is 200 regardless of existence.
    // Establish a genuinely live session first: the reset must be the thing
    // that kills it, not an earlier logout.
    const preResetLogin = await api(base, '/auth/login', {
      method: 'POST', body: { email: 'ada@signup.example', password: 'correct-horse-9' },
    });
    const preResetSc = preResetLogin.headers?.['set-cookie'] as unknown as string[] | undefined;
    const preResetCookie = ((Array.isArray(preResetSc) ? preResetSc[0] : '') ?? '').split(';')[0] ?? '';
    const preResetLive = await api(base, '/auth/session', { headers: { cookie: preResetCookie } });
    check('session is live immediately before the reset', (preResetLive.json as { authenticated?: boolean }).authenticated === true);

    const resetUnknown = await api(base, '/auth/password/reset/request', {
      method: 'POST', body: { email: 'nobody@nowhere.example' },
    });
    check('reset request for unknown address returns 200', resetUnknown.status === 200);
    const resetReq = await api(base, '/auth/password/reset/request', {
      method: 'POST', body: { email: 'ada@signup.example' },
    });
    check('reset request accepted (200)', resetReq.status === 200);
    const resetRow = await pool.query<{ body: string | null }>(
      `SELECT body FROM email_outbox WHERE kind = 'password.reset' AND recipient = 'ada@signup.example' ORDER BY created_at DESC LIMIT 1`,
    );
    check('reset token row written to outbox', resetRow.rows.length === 1 && !!resetRow.rows[0].body);
    const resetToken = resetRow.rows[0].body!.replace('Reset: ', '');
    const weakReset = await api(base, '/auth/password/reset', {
      method: 'POST', body: { token: resetToken, password: 'short', confirmPassword: 'short' },
    });
    check('weak reset password rejected (400)', weakReset.status === 400);
    const resetOk = await api(base, '/auth/password/reset', {
      method: 'POST', body: { token: resetToken, password: 'brand-new-horse-7', confirmPassword: 'brand-new-horse-7' },
    });
    check('password reset completes (200)', resetOk.status === 200);
    const resetReuse = await api(base, '/auth/password/reset', {
      method: 'POST', body: { token: resetToken, password: 'another-horse-8', confirmPassword: 'another-horse-8' },
    });
    check('reset token single-use (410 on reuse)', resetReuse.status === 410);

    // Expired reset token → 410 (ledger N1.3 acceptance).
    await api(base, '/auth/password/reset/request', { method: 'POST', body: { email: 'ada@signup.example' } });
    const expiredResetRow = await pool.query<{ id: string; body: string | null }>(
      `SELECT id, body FROM email_outbox WHERE kind = 'password.reset' AND recipient = 'ada@signup.example' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    );
    await pool.query(`UPDATE email_outbox SET expires_at = now() - interval '1 hour' WHERE id = $1`, [
      expiredResetRow.rows[0].id,
    ]);
    const expiredResetToken = expiredResetRow.rows[0].body!.replace('Reset: ', '');
    const expiredReset = await api(base, '/auth/password/reset', {
      method: 'POST',
      body: { token: expiredResetToken, password: 'expired-horse-2', confirmPassword: 'expired-horse-2' },
    });
    check('expired reset token rejected (410)', expiredReset.status === 410);

    // An unknown reset token is a 401 — not a token we ever issued.
    const bogusReset = await api(base, '/auth/password/reset', {
      method: 'POST', body: { token: 'never-issued-token', password: 'bogus-horse-3', confirmPassword: 'bogus-horse-3' },
    });
    check('unknown reset token rejected (401)', bogusReset.status === 401);

    // Measured immediately after the reset, before any new login can create a
    // session: the reset must leave nothing active behind.
    const activeAfterReset = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM session WHERE person_id = (SELECT id FROM person WHERE email = 'ada@signup.example') AND status = 'active'`,
    );
    check('reset left no active sessions behind', Number(activeAfterReset.rows[0].n) === 0);

    // A reset revokes the pre-existing session (it was issued under the old
    // credential) and the new password logs in.
    const loginOldPassword = await api(base, '/auth/login', {
      method: 'POST', body: { email: 'ada@signup.example', password: 'correct-horse-9' },
    });
    check('old password no longer logs in (401)', loginOldPassword.status === 401);
    const loginNewPassword = await api(base, '/auth/login', {
      method: 'POST', body: { email: 'ada@signup.example', password: 'brand-new-horse-7' },
    });
    check('new password logs in (201)', loginNewPassword.status === 201);
    const newCookieHeader = (() => {
      const sc = loginNewPassword.headers?.['set-cookie'] as unknown as string[] | undefined;
      return Array.isArray(sc) ? sc[0] : undefined;
    })();
    const newCookieStr = (newCookieHeader ?? '').split(';')[0] ?? '';
    const staleSession = await api(base, '/auth/session', { headers: { cookie: preResetCookie } });
    check('pre-reset session revoked by reset', (staleSession.json as { authenticated?: boolean }).authenticated !== true);

    // Change password: wrong current password 401, correct one rotates and
    // keeps the caller's own session alive.
    const wrongChange = await api(base, '/auth/password/change', {
      method: 'POST', headers: { cookie: newCookieStr },
      body: { currentPassword: 'not-the-password', password: 'changed-horse-1', confirmPassword: 'changed-horse-1' },
    });
    check('change with wrong current password rejected (401)', wrongChange.status === 401);
    const changeOk = await api(base, '/auth/password/change', {
      method: 'POST', headers: { cookie: newCookieStr },
      body: { currentPassword: 'brand-new-horse-7', password: 'changed-horse-1', confirmPassword: 'changed-horse-1' },
    });
    check('change password succeeds (200)', changeOk.status === 200);
    const stillAuthed = await api(base, '/auth/session', { headers: { cookie: newCookieStr } });
    check("changer's own session survives the rotation", (stillAuthed.json as { authenticated?: boolean }).authenticated === true);
    const changeLogin = await api(base, '/auth/login', {
      method: 'POST', body: { email: 'ada@signup.example', password: 'changed-horse-1' },
    });
    check('post-change password logs in (201)', changeLogin.status === 201);

    // Explicit session revocation endpoint (A-03).
    const revokeOthers = await api(base, '/auth/sessions/revoke', {
      method: 'POST', headers: { cookie: newCookieStr },
    });
    check('session revoke endpoint reports a count', revokeOthers.status === 200 &&
      typeof (revokeOthers.json as { revoked?: number }).revoked === 'number');
    const afterRevoke = await api(base, '/auth/session', { headers: { cookie: newCookieStr } });
    check('caller keeps their own session after revoke-others', (afterRevoke.json as { authenticated?: boolean }).authenticated === true);

    check('password change + reset audited', (await pool.query<{ action: string }>(
      `SELECT action FROM audit_event WHERE org_id = (SELECT org_id FROM person WHERE email = 'ada@signup.example')`,
    )).rows.map((r) => r.action).some((a) => a === 'auth.password_reset' || a === 'auth.password_changed'));

    /* ================================================================== */
    /* V2 spec §9/§10/§11/§12/§13/§14 — boards, semantic roles, guest,    */
    /* compliance guard, dashboards, communication and files.             */
    /* ================================================================== */

    console.log('\n-- V2: boards, semantic roles, items');

    const engA = randomUUID();
    const engB = randomUUID();
    const amPerson = await pool.query<{ id: string }>(`SELECT id FROM person WHERE email = 'am@test.example'`);
    const amId = amPerson.rows[0].id;
    const leadPerson = await pool.query<{ id: string }>(`SELECT id FROM person WHERE email = 'lead@test.example'`);
    const v2LeadId = leadPerson.rows[0].id;
    await pool.query(
      `INSERT INTO engagement (id, org_id, agency_id, name) VALUES ($1,$2,$3,$4), ($5,$2,$6,$7)`,
      [engA, orgId, agencyA, 'Engagement A', engB, agencyB, 'Engagement B'],
    );
    // Bind the AM and the lead to Engagement A only — this is the V2 boundary.
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id) VALUES ($1,'account_manager','engagement',$2), ($3,'production_lead','engagement',$2)`,
      [amId, engA, v2LeadId],
    );

    const wsA = await api(base, '/boards/workspaces', {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Client Workspace A', engagementId: engA },
    });
    const wsAId = (wsA.json as { id: string }).id;
    check('client workspace created for an engagement', wsA.status === 201 && Boolean(wsAId));

    const wsNoEng = await api(base, '/boards/workspaces', {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Broken', workspaceType: 'client' },
    });
    check('client workspace without engagement rejected', wsNoEng.status === 400);

    const boardA = await api(base, '/boards', {
      email: 'am@test.example', method: 'POST',
      body: { workspaceId: wsAId, name: 'Production Pipeline' },
    });
    const boardAId = (boardA.json as { id: string }).id;
    check('board created in workspace', boardA.status === 201 && Boolean(boardAId));

    // Every fresh board carries the two system columns (§9.4).
    const detail0 = await api(base, `/boards/${boardAId}`, { email: 'am@test.example' });
    const detail0Body = detail0.json as { columns: Array<{ column_type: string; is_system: boolean }> };
    const systemTypes = detail0Body.columns.filter((c) => c.is_system).map((c) => c.column_type).sort();
    check('board opens with creation_log + last_updated columns', JSON.stringify(systemTypes) === JSON.stringify(['creation_log', 'last_updated']));

    // Column types: valid, unknown, and config-required.
    const statusCol = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Production stage', columnType: 'status', config: { labels: [{ id: 's1', text: 'In progress' }] }, semanticRole: 'production_stage' },
    });
    const statusColId = (statusCol.json as { id: string }).id;
    check('status column with semantic role created', statusCol.status === 201);

    const badType = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Nope', columnType: 'telepathy' },
    });
    check('unknown column type rejected 400', badType.status === 400);

    const noLabels = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Stage no labels', columnType: 'status' },
    });
    check('status column without labels rejected 400', noLabels.status === 400);

    const badRole = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Rogue', columnType: 'text', semanticRole: 'not_a_role' },
    });
    check('unknown semantic role rejected 400', badRole.status === 400);

    const systemColType = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Sneaky', columnType: 'creation_log' },
    });
    check('system column type cannot be user-added', systemColType.status === 400);

    const hoursCol = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Capacity hours', columnType: 'duration', config: { unit: 'hours' }, semanticRole: 'capacity_hours' },
    });
    const hoursColId = (hoursCol.json as { id: string }).id;
    check('duration/capacity_hours column created', hoursCol.status === 201);

    const qaTechCol = await api(base, `/boards/${boardAId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Technical QA', columnType: 'status', config: { labels: [{ id: 'passed', text: 'Passed' }, { id: 'failed', text: 'Failed' }] }, semanticRole: 'qa_technical' },
    });
    const qaTechColId = (qaTechCol.json as { id: string }).id;
    check('qa_technical semantic column created', qaTechCol.status === 201);

    const semanticList = await api(base, '/boards/semantic-roles', { email: 'am@test.example' });
    check('semantic role vocabulary exposed', Array.isArray((semanticList.json as { roles: string[] }).roles) && (semanticList.json as { roles: string[] }).roles.length === 9);

    // Items.
    const v2ItemA = await api(base, `/boards/${boardAId}/items`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Acme launch film', columnValues: { [hoursColId]: 12, [statusColId]: 's1' } },
    });
    const v2ItemAId = (v2ItemA.json as { id: string }).id;
    check('item created with column values', v2ItemA.status === 201 && Boolean(v2ItemAId));

    const strayColumn = await api(base, `/boards/${boardAId}/items`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Bad', columnValues: { 'not-a-column': 1 } },
    });
    check('column value from another board rejected', strayColumn.status === 400);

    // Aggregation: the item write above must have produced dashboard metrics.
    const v2Metrics = await pool.query<{ semantic_role: string; numeric_value: number | null }>(
      'SELECT semantic_role, numeric_value FROM dashboard_metric WHERE item_id = $1 ORDER BY semantic_role',
      [v2ItemAId],
    );
    const rolesWritten = v2Metrics.rows.map((r) => r.semantic_role);
    check('semantic-role values aggregated into dashboard_metric', rolesWritten.includes('capacity_hours') && rolesWritten.includes('production_stage'));
    const capMetric = v2Metrics.rows.find((r) => r.semantic_role === 'capacity_hours');
    check('capacity_hours aggregated numerically', Number(capMetric?.numeric_value) === 12);

    console.log('\n-- V2: engagement-boundary isolation (§7.7/§14)');

    const boardsForB = await api(base, '/boards', { email: 'am@test.example' });
    check('engagement-scoped user sees only its own board', Array.isArray(boardsForB.json) && (boardsForB.json as unknown[]).length === 1);

    const otherEngagementBoard = await api(base, `/boards/${boardAId}`, { email: 'agency-b@test.example' });
    check('foreign-engagement actor refused board (403)', otherEngagementBoard.status === 403);

    // Management sees across engagements.
    const opsBoards = await api(base, '/boards', { email: 'ops@test.example' });
    check('management reads boards across engagements', Array.isArray(opsBoards.json) && (opsBoards.json as unknown[]).length >= 1);

    console.log('\n-- V2: compliance guard blocks qa_technical (§12.5)');

    const guardRun = await api(base, `/boards/items/${v2ItemAId}/compliance/run`, {
      email: 'lead@test.example', method: 'POST',
      body: { files: [{ name: 'final-v3 draft internal.jpg', metadata: { author: 'Acme Corp' } }] },
    });
    const guardRows = guardRun.json as Array<{ id: string; check_type: string; status: string }>;
    check('guard records all three scan types', guardRun.status === 201 && guardRows.length === 3);
    check('metadata scan fails on leaked author', guardRows.some((r) => r.check_type === 'metadata_scan' && r.status === 'failed'));
    check('filename scan fails on internal marker', guardRows.some((r) => r.check_type === 'filename_scan' && r.status === 'failed'));
    check('attribution scan fails without licence', guardRows.some((r) => r.check_type === 'attribution_scan' && r.status === 'failed'));

    const blockedQa = await api(base, `/boards/items/${v2ItemAId}`, {
      email: 'lead@test.example', method: 'PATCH',
      body: { columnValues: { [qaTechColId]: 'passed' } },
    });
    check('qa_technical blocked while compliance finding open', blockedQa.status === 400);

    const failedCheck = guardRows.find((r) => r.check_type === 'metadata_scan');
    const cleared = await api(base, `/boards/compliance/${failedCheck?.id}/clear`, {
      email: 'lead@test.example', method: 'POST',
      body: { reason: 'Author metadata stripped in the resubmitted file' },
    });
    check('named human clears a finding', cleared.status === 201);

    const clearWithoutReason = await api(base, `/boards/compliance/${guardRows.find((r) => r.check_type === 'filename_scan')?.id}/clear`, {
      email: 'lead@test.example', method: 'POST',
      body: { reason: '' },
    });
    check('clearing without a reason rejected', clearWithoutReason.status === 400);

    // Two findings remain open, so the gate still holds.
    const stillBlocked = await api(base, `/boards/items/${v2ItemAId}`, {
      email: 'lead@test.example', method: 'PATCH',
      body: { columnValues: { [qaTechColId]: 'passed' } },
    });
    check('gate holds while any finding remains open', stillBlocked.status === 400);

    for (const r of guardRows.filter((x) => x.status === 'failed' && x.id !== failedCheck?.id)) {
      await api(base, `/boards/compliance/${r.id}/clear`, {
        email: 'lead@test.example', method: 'POST',
        body: { reason: 'Reviewed and accepted by production lead' },
      });
    }
    const qaPasses = await api(base, `/boards/items/${v2ItemAId}`, {
      email: 'lead@test.example', method: 'PATCH',
      body: { columnValues: { [qaTechColId]: 'passed' } },
    });
    check('qa_technical passes once every finding is cleared', qaPasses.status === 200);

    console.log('\n-- V2: guest scope is one item, time-boxed (§14.1/§14.4)');

    const guestLink = await api(base, `/boards/items/${v2ItemAId}/guest-links`, {
      email: 'lead@test.example', method: 'POST',
      body: { email: 'guest@acme.example', expiresInDays: 7 },
    });
    const guestToken = (guestLink.json as { token: string }).token;
    check('guest link created with expiry', guestLink.status === 201 && Boolean(guestToken));

    const longGuestLink = await api(base, `/boards/items/${v2ItemAId}/guest-links`, {
      email: 'lead@test.example', method: 'POST',
      body: { email: 'guest@acme.example', expiresInDays: 365 },
    });
    check('guest link expiry beyond 90 days rejected', longGuestLink.status === 400);

    const guestPerson = randomUUID();
    await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1,$2,$3,$4)', [
      guestPerson, orgId, 'guest@acme.example', 'Acme Guest',
    ]);
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id) VALUES ($1,'guest','engagement',$2)`,
      [guestPerson, engA],
    );

    const guestReadsItem = await api(base, `/boards/items/${v2ItemAId}`, { email: 'guest@acme.example' });
    check('guest reads its one scoped item', guestReadsItem.status === 200 && (guestReadsItem.json as { id: string }).id === v2ItemAId);

    // A second item in the same board — the guest must not reach it.
    const v2ItemB = await api(base, `/boards/${boardAId}/items`, {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'Confidential second job' },
    });
    const v2ItemBId = (v2ItemB.json as { id: string }).id;
    const guestReadsOther = await api(base, `/boards/items/${v2ItemBId}`, { email: 'guest@acme.example' });
    check('guest cannot read a sibling item (404, no existence hint)', guestReadsOther.status === 404);

    const guestListsBoard = await api(base, `/boards/${boardAId}`, { email: 'guest@acme.example' });
    check('guest refused board-level read', guestListsBoard.status === 403);

    const guestWritesItem = await api(base, `/boards/items/${v2ItemAId}`, {
      email: 'guest@acme.example', method: 'PATCH', body: { name: 'Guest rename' },
    });
    check('guest cannot edit the item', guestWritesItem.status === 403);

    // Expiry: push the link into the past, the guest loses access entirely.
    await pool.query(`UPDATE guest_link SET expires_at = now() - interval '1 day' WHERE token = $1`, [guestToken]);
    const guestAfterExpiry = await api(base, `/boards/items/${v2ItemAId}`, { email: 'guest@acme.example' });
    check('expired guest link resolves to no access', guestAfterExpiry.status === 401);
    await pool.query(`UPDATE guest_link SET expires_at = now() + interval '7 days' WHERE token = $1`, [guestToken]);

    console.log('\n-- V2: dashboards read only aggregated metrics (§10)');

    const v2Dash = await api(base, '/dashboards', {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Engagement A health', scopeRole: 'account_manager', engagementId: engA, widgets: ['capacity_kpi', 'qa_pass_rate', 'workload_leaderboard'] },
    });
    const dashId = (v2Dash.json as { id: string }).id;
    check('account-manager dashboard created with widgets', v2Dash.status === 201 && Boolean(dashId));

    const unscopedDash = await api(base, '/dashboards', {
      email: 'am@test.example', method: 'POST',
      body: { name: 'No engagement', scopeRole: 'client' },
    });
    check('client dashboard without engagement rejected', unscopedDash.status === 400);

    const rendered = await api(base, `/dashboards/${dashId}`, { email: 'am@test.example' });
    const renderedBody = rendered.json as { widgets: Array<{ widget_type: string; value: number | null }> };
    const capacityWidget = renderedBody.widgets.find((w) => w.widget_type === 'capacity_kpi');
    check('capacity KPI reads the aggregated metric (12 hours)', Number(capacityWidget?.value) === 12);
    const passWidget = renderedBody.widgets.find((w) => w.widget_type === 'qa_pass_rate');
    check('QA pass-rate widget computed from metrics', passWidget?.value === 100);

    const badWidget = await api(base, `/dashboards/${dashId}/widgets`, {
      email: 'am@test.example', method: 'POST', body: { name: 'x', widgetType: 'crystal_ball' },
    });
    check('unknown widget type rejected 400', badWidget.status === 400);

    const v2Catalog = await api(base, '/dashboards/widget-catalog', { email: 'am@test.example' });
    check('widget catalog exposes the six §10.6 widgets', (v2Catalog.json as { widgets: unknown[] }).widgets.length === 6);

    // Client dashboards are role-scoped: the client actor sees only its own.
    const clientPerson = randomUUID();
    await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1,$2,$3,$4)', [
      clientPerson, orgId, 'client-a@test.example', 'Client A',
    ]);
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id) VALUES ($1,'client_approver','engagement',$2)`,
      [clientPerson, engA],
    );
    const clientDashList = await api(base, '/dashboards', { email: 'client-a@test.example' });
    check('client sees no account-manager dashboard', Array.isArray(clientDashList.json) && (clientDashList.json as unknown[]).length === 0);

    const clientDash = await api(base, '/dashboards', {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Client A view', scopeRole: 'client', engagementId: engA, widgets: ['capacity_kpi'] },
    });
    const clientDashId = (clientDash.json as { id: string }).id;
    const clientRenders = await api(base, `/dashboards/${clientDashId}`, { email: 'client-a@test.example' });
    check('client renders its own engagement dashboard', clientRenders.status === 200);

    // A client from another engagement is refused.
    const clientBPerson = randomUUID();
    await pool.query('INSERT INTO person (id, org_id, email, name) VALUES ($1,$2,$3,$4)', [
      clientBPerson, orgId, 'client-b@test.example', 'Client B',
    ]);
    await pool.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id) VALUES ($1,'client_approver','engagement',$2)`,
      [clientBPerson, engB],
    );
    const clientBCross = await api(base, `/dashboards/${clientDashId}`, { email: 'client-b@test.example' });
    check('client from another engagement refused dashboard', clientBCross.status === 403);

    console.log('\n-- V2: communication visibility boundary (§11.2)');

    const internalChannel = await api(base, '/comms/channels', {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'Internal production', visibility: 'internal', engagementId: engA },
    });
    const internalChannelId = (internalChannel.json as { id: string }).id;
    check('internal channel created', internalChannel.status === 201);

    const externalsSeeInternal = await api(base, '/comms/channels', { email: 'client-a@test.example' });
    check('client never sees an internal channel', Array.isArray(externalsSeeInternal.json) && (externalsSeeInternal.json as unknown[]).length === 0);

    const clientPostsToInternal = await api(base, `/comms/channels/${internalChannelId}/messages`, {
      email: 'client-a@test.example', method: 'POST', body: { body: 'sneaking in' },
    });
    check('client cannot post to an internal channel (403)', clientPostsToInternal.status === 403);

    const externalChannel = await api(base, '/comms/channels', {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'Client A updates', visibility: 'external', engagementId: engA, memberIds: [clientPerson] },
    });
    const externalChannelId = (externalChannel.json as { id: string }).id;
    check('external channel created', externalChannel.status === 201);

    const rootMessage = await api(base, `/comms/channels/${externalChannelId}/messages`, {
      email: 'lead@test.example', method: 'POST',
      body: { body: 'First cut is ready', mentions: [clientPerson] },
    });
    const rootMessageId = (rootMessage.json as { id: string }).id;
    check('message posted to external channel', rootMessage.status === 201);

    const mentionNotif = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM notification WHERE recipient_id = $1 AND kind = 'mention'`,
      [clientPerson],
    );
    check('@mention raised an elevated notification', Number(mentionNotif.rows[0].n) >= 1);

    const threadReply = await api(base, `/comms/channels/${externalChannelId}/messages`, {
      email: 'lead@test.example', method: 'POST',
      body: { body: 'And the alt cut', parentMessageId: rootMessageId },
    });
    check('threaded reply accepted', threadReply.status === 201);

    const wrongThread = await api(base, `/comms/channels/${internalChannelId}/messages`, {
      email: 'lead@test.example', method: 'POST',
      body: { body: 'mismatched parent', parentMessageId: rootMessageId },
    });
    check('reply with a foreign parent message rejected', wrongThread.status === 400);

    const clientReadsExternal = await api(base, `/comms/channels/${externalChannelId}/messages`, { email: 'client-a@test.example' });
    check('client reads the external channel', clientReadsExternal.status === 200);

    // Internal→external is an explicit, reasoned, audited action.
    const convertNoReason = await api(base, `/comms/channels/${internalChannelId}/convert-external`, {
      email: 'lead@test.example', method: 'POST', body: { reason: '' },
    });
    check('conversion without a reason rejected', convertNoReason.status === 400);

    const convert = await api(base, `/comms/channels/${internalChannelId}/convert-external`, {
      email: 'lead@test.example', method: 'POST', body: { reason: 'Client needs to see this thread' },
    });
    check('explicit conversion to external succeeds', convert.status === 201);
    const convertAudit = await pool.query<{ action: string }>(
      `SELECT action FROM audit_event WHERE action = 'channel.converted_external' AND target_id = $1`,
      [internalChannelId],
    );
    check('conversion is audited', convertAudit.rows.length === 1);

    console.log('\n-- V2: meetings record attendance honestly (§11.4)');

    const badMeeting = await api(base, '/comms/meetings', {
      email: 'lead@test.example', method: 'POST',
      body: { title: 'No room', startsAt: new Date(Date.now() + 3600_000).toISOString() },
    });
    check('meeting without a room or link rejected', badMeeting.status === 400);

    const v2Meeting = await api(base, '/comms/meetings', {
      email: 'lead@test.example', method: 'POST',
      body: {
        title: 'Kickoff',
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        roomRef: 'jitsi-palette-kickoff',
        engagementId: engA,
        participantIds: [amId],
      },
    });
    const meetingId = (v2Meeting.json as { id: string }).id;
    check('meeting scheduled', v2Meeting.status === 201);

    const invitedRow = await pool.query<{ joined_at: string | null }>(
      'SELECT joined_at FROM meeting_participant WHERE meeting_id = $1 AND person_id = $2',
      [meetingId, amId],
    );
    check('invited participant has not "attended"', invitedRow.rows[0]?.joined_at === null);

    await api(base, `/comms/meetings/${meetingId}/join`, { email: 'am@test.example', method: 'POST' });
    const joinedRow = await pool.query<{ joined_at: string | null }>(
      'SELECT joined_at FROM meeting_participant WHERE meeting_id = $1 AND person_id = $2',
      [meetingId, amId],
    );
    check('attendance recorded only on actual join', joinedRow.rows[0]?.joined_at !== null);

    console.log('\n-- V2: files/DAM version chain (§13)');

    const fileV1 = await api(base, '/files', {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'hero-shot.png', content: 'v1-bytes', contentType: 'image/png', engagementId: engA, metadata: { license: 'CC0' } },
    });
    const fileV1Id = (fileV1.json as { id: string }).id;
    check('file uploaded (native source)', fileV1.status === 201);

    const fileV2 = await api(base, '/files', {
      email: 'lead@test.example', method: 'POST',
      body: { name: 'hero-shot.png', content: 'v2-bytes-longer', contentType: 'image/png', supersedes: fileV1Id, source: 'adobe_plugin', externalRef: 'adobe-77' },
    });
    check('re-upload creates version 2', fileV2.status === 201 && (fileV2.json as { version_number: number }).version_number === 2);

    const v2Chain = await api(base, `/files/${fileV1Id}/versions`, { email: 'lead@test.example' });
    check('version chain returns both versions', Array.isArray(v2Chain.json) && (v2Chain.json as unknown[]).length === 2);

    const badSource = await api(base, '/files', {
      email: 'lead@test.example', method: 'POST', body: { name: 'x.png', source: 'floppy_disk' },
    });
    check('unknown file source rejected 400', badSource.status === 400);

    const v2Attach = await api(base, `/files/items/${v2ItemAId}/attach`, {
      email: 'lead@test.example', method: 'POST', body: { fileId: fileV1Id, columnId: hoursColId },
    });
    check('file attached to an item column', v2Attach.status === 201, `status=${v2Attach.status} body=${JSON.stringify(v2Attach.json)}`);

    const attached = await api(base, `/files/items/${v2ItemAId}`, { email: 'lead@test.example' });
    check('attached files read back', Array.isArray(attached.json) && (attached.json as unknown[]).length === 1);

    const guestListsFiles = await api(base, '/files', { email: 'guest@acme.example' });
    check('guest cannot list files (403)', guestListsFiles.status === 403);

    console.log('\n-- V2: AI agents propose, humans decide (§12)');

    const catalogRes = await api(base, '/agents', { email: 'lead@test.example' });
    const catalogBody = catalogRes.json as {
      provider: { name: string; configured: boolean };
      agents: Array<{ key: string; autonomy: string; requiresApproval: boolean }>;
    };
    const v2Agents = catalogBody.agents;
    check('agent catalog exposes six agents', v2Agents.length === 6);
    check('agent catalog declares autonomy levels', v2Agents.every((a) => Boolean(a.autonomy)));
    check('only the reminder agent skips approval', v2Agents.filter((a) => !a.requiresApproval).map((a) => a.key).join(',') === 'kpi_reminder');
    // §12.3/§12.5 — no LLM key in the test env means the seam degrades to a
    // no-op rather than failing; the catalog reports that state honestly.
    check('LLM seam reports unconfigured without env keys', catalogBody.provider.configured === false && catalogBody.provider.name === 'none');

    const analysis = await api(base, '/agents/brief_analysis/run', {
      email: 'lead@test.example', method: 'POST',
      body: { itemId: v2ItemAId, payload: { missingFields: ['budget', 'deadline'], baseHours: 20 } },
    });
    const analysisRun = analysis.json as { id: string; status: string; proposal: { estimatedHoursRange: { low: number; high: number } } };
    check('propose-only agent records a proposal, does not apply', analysis.status === 201 && analysisRun.status === 'proposed');
    check('proposal carries an hour range for a human to confirm', analysisRun.proposal.estimatedHoursRange.low === 16 && analysisRun.proposal.estimatedHoursRange.high === 25);

    const v2Confirmed = await api(base, `/agents/runs/${analysisRun.id}/decide`, {
      email: 'ops@test.example', method: 'POST', body: { decision: 'confirmed' },
    });
    check('human confirms the proposal', v2Confirmed.status === 201 && (v2Confirmed.json as { status: string }).status === 'confirmed');

    const doubleDecide = await api(base, `/agents/runs/${analysisRun.id}/decide`, {
      email: 'ops@test.example', method: 'POST', body: { decision: 'rejected' },
    });
    check('a decided proposal cannot be re-decided', doubleDecide.status === 404);

    const v2Reminder = await api(base, '/agents/kpi_reminder/run', {
      email: 'lead@test.example', method: 'POST',
      body: { itemId: v2ItemAId, payload: { message: 'Review is overdue' } },
    });
    check('act-and-log reminder applies without approval', v2Reminder.status === 201 && (v2Reminder.json as { status: string }).status === 'applied');

    const reminderNotif = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM notification WHERE kind = 'agent_reminder' AND recipient_id = $1`,
      [v2LeadId],
    );
    check('reminder raised a notification without mutating the item', Number(reminderNotif.rows[0].n) >= 1);

    const unknownAgent = await api(base, '/agents/launch_missiles/run', {
      email: 'lead@test.example', method: 'POST', body: {},
    });
    check('unknown agent rejected 400', unknownAgent.status === 400);

    const guestRunsAgent = await api(base, '/agents/brief_analysis/run', {
      email: 'guest@acme.example', method: 'POST', body: { itemId: v2ItemAId, payload: {} },
    });
    check('guest cannot run agents (403)', guestRunsAgent.status === 403);

    // Every agent action is on the audit trail (§12.6).
    const agentAudit = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM audit_event WHERE action IN ('agent.ran','agent.confirmed')`,
    );
    check('agent runs and decisions are audited', Number(agentAudit.rows[0].n) >= 3);

    /* ---------------- */

    console.log('\n-- V2: view configuration (§9.5)');

    const kanbanNoConfig = await api(base, `/boards/${boardAId}/views`, {
      email: 'am@test.example', method: 'POST', body: { name: 'Board', viewType: 'kanban' },
    });
    check('kanban view without group_by_column_id rejected', kanbanNoConfig.status === 400);

    const kanban = await api(base, `/boards/${boardAId}/views`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Pipeline board', viewType: 'kanban', config: { group_by_column_id: statusColId }, isDefault: true },
    });
    check('kanban view configured', kanban.status === 201);

    const gallery = await api(base, `/boards/${boardAId}/views`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Reference gallery', viewType: 'gallery', config: { files_column_id: hoursColId } },
    });
    check('gallery view configured', gallery.status === 201);

    const badViewType = await api(base, `/boards/${boardAId}/views`, {
      email: 'am@test.example', method: 'POST', body: { name: 'Hologram', viewType: 'hologram' },
    });
    check('unknown view type rejected', badViewType.status === 400);

    console.log('\n-- V2: board cloning carries semantic roles (§10.2)');

    const v2Clone = await api(base, '/boards', {
      email: 'am@test.example', method: 'POST',
      body: { workspaceId: wsAId, name: 'Pipeline template', isTemplate: true },
    });
    const v2TemplateId = (v2Clone.json as { id: string }).id;
    const cloner = await api(base, '/boards', {
      email: 'am@test.example', method: 'POST',
      body: { workspaceId: wsAId, name: 'Engagement B pipeline', clonedFrom: v2TemplateId },
    });
    check('board cloned from template', cloner.status === 201);

    const clonedDetail = await api(base, `/boards/${(cloner.json as { id: string }).id}`, { email: 'am@test.example' });
    check('cloned board is empty of items but keeps structure', (clonedDetail.json as { items: unknown[] }).items.length === 0);

    // Semantic role survives the v2Clone only when it was present on the source.
    await api(base, `/boards/${v2TemplateId}/columns`, {
      email: 'am@test.example', method: 'POST',
      body: { name: 'Revenue', columnType: 'number', semanticRole: 'revenue_value' },
    });
    const cloner2 = await api(base, '/boards', {
      email: 'am@test.example', method: 'POST',
      body: { workspaceId: wsAId, name: 'Clone with role', clonedFrom: v2TemplateId },
    });
    const clonedCols = await api(base, `/boards/${(cloner2.json as { id: string }).id}`, { email: 'am@test.example' });
    const clonedRoles = (clonedCols.json as { columns: Array<{ semantic_role: string | null }> }).columns
      .map((c) => c.semantic_role)
      .filter(Boolean);
    check('cloning carries semantic roles forward', clonedRoles.includes('revenue_value'));
  } finally {
    await app.close();
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
