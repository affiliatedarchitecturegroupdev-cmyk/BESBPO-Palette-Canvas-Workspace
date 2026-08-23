import { cookies } from 'next/headers';
import { API_URL, USER_COOKIE } from './config';

export interface Person {
  id: string;
  email: string;
  name: string;
}

export interface Me {
  userId: string;
  orgId: string;
  roles: string[];
  scopes: { workspaceId: string; visibility: string }[];
}

/** Resolved dev user email from the switcher cookie, or null. */
export async function currentEmail(): Promise<string | null> {
  const store = await cookies();
  return store.get(USER_COOKIE)?.value ?? null;
}

export async function api<T>(path: string, email: string | null, init?: RequestInit): Promise<T | { error: string }> {
  if (!email) return { error: 'not signed in' };
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { 'x-user-email': email, ...(init?.headers ?? {}) },
    });
    if (!res.ok) return { error: `${res.status}` };
    return (await res.json()) as T;
  } catch {
    return { error: 'api unreachable' };
  }
}

export async function me(email: string | null) {
  return api<Me>('/identity/me', email);
}

export async function users(): Promise<Person[]> {
  try {
    const res = await fetch(`${API_URL}/identity/users`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Person[];
  } catch {
    return [];
  }
}

export interface Agency {
  id: string;
  name: string;
  confidentiality_tier: string;
  health: string;
}

export interface Brand {
  id: string;
  agency_id: string;
  name: string;
}

export async function agencies(email: string | null) {
  return api<Agency[]>('/directory/agencies', email);
}

export async function brands(email: string | null) {
  return api<Brand[]>('/directory/brands', email);
}

export interface Brief {
  id: string;
  title: string;
  status: string;
  agency_id: string;
  brand_id: string;
  template_id: string | null;
  fields: Record<string, unknown>;
  attachments: { label: string; url: string }[];
  requested_date: string | null;
  source_channel: string;
  confidentiality: string;
  duplicate_of: string | null;
  triage: {
    decision: string;
    estimateHours?: number;
    capabilityOk: boolean;
    riskFlags?: string[];
    notes?: string;
    decidedBy: string;
    decidedAt: string;
  } | null;
  created_at: string;
}

export async function inbox(email: string | null) {
  return api<Brief[]>('/intake', email);
}

export async function brief(email: string | null, id: string) {
  return api<Brief>(`/intake/${id}`, email);
}

export interface Project {
  id: string;
  name: string;
  status: string;
  agency_id: string;
  brand_id: string;
  template_id: string;
  visibility: string;
  created_at: string;
}

export interface ProjectHome {
  project: Project;
  milestones: { id: string; name: string; target_date: string | null; status: string }[];
  roles: { person_id: string; role: string; email: string; name: string }[];
  brief: Brief | null;
}

export async function projects(email: string | null) {
  return api<Project[]>('/projects', email);
}

export async function projectHome(email: string | null, id: string) {
  return api<ProjectHome>(`/projects/${id}`, email);
}

export interface Template {
  id: string;
  key: string;
  name: string;
  version: number;
  definition: {
    phases: string[];
    requiredBriefFields: { name: string; label: string; type: 'text' | 'textarea' }[];
    deliverables: string[];
    qualityChecks: string[];
    slaTargets: { triageHours: number };
    approvalSteps: string[];
    handoverRequirements: string[];
  };
}

export async function templates(email: string | null) {
  return api<Template[]>('/templates', email);
}

/* ---------- Phase 3: production workspace ---------- */

export interface Task {
  id: string;
  project_id: string;
  workstream_id: string | null;
  deliverable_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  estimate_hours: number | null;
  sla_target: string | null;
  custom_fields: Record<string, unknown>;
  position: number;
  created_by: string;
}

export interface Board {
  columns: Record<string, string[]>;
  tasks: Task[];
}

export async function board(email: string | null, projectId: string) {
  return api<Board>(`/tasks/project/${projectId}`, email);
}

export async function calendar(email: string | null, projectId: string) {
  return api<Array<Pick<Task, 'id' | 'title' | 'due_date' | 'status' | 'assignee_id' | 'priority'>>>(
    `/tasks/project/${projectId}/calendar`,
    email,
  );
}

export interface Workstream {
  id: string;
  project_id: string;
  name: string;
  status: string;
}

export async function workstreams(email: string | null, projectId: string) {
  return api<Workstream[]>(`/tasks/${projectId}/workstreams`, email);
}

export interface Deliverable {
  id: string;
  project_id: string;
  workstream_id: string | null;
  name: string;
  deliverable_type: string;
  status: string;
  due_date: string | null;
  assignee_id: string | null;
}

export async function deliverables(email: string | null, projectId: string) {
  return api<Deliverable[]>(`/deliverables/project/${projectId}`, email);
}

export interface Comment {
  id: string;
  target_type: string;
  target_id: string;
  body: string;
  mentions: string[];
  created_by: string;
  created_at: string;
  resolved: boolean;
}

export async function comments(email: string | null, targetType: string, targetId: string) {
  return api<Comment[]>(`/comments/${targetType}/${targetId}`, email);
}

export interface NotificationItem {
  id: string;
  kind: string;
  target_type: string;
  target_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface Inbox {
  items: NotificationItem[];
  unread: number;
}

export async function notifications(email: string | null) {
  return api<Inbox>('/notifications', email);
}

export interface WorkloadRow {
  person_id: string;
  name: string;
  open_tasks: number;
  estimated_hours: number;
  logged_hours: number;
}

export async function workload(email: string | null) {
  return api<WorkloadRow[]>('/workload', email);
}

export interface TaskDetail {
  checklist: { id: string; label: string; done: boolean }[];
  dependencies: { blocks: string[]; blocked_by: string[] };
  collaborators: string[];
}

export async function taskDetail(email: string | null, id: string) {
  return api<TaskDetail>(`/tasks/${id}`, email);
}

/* ---- Phase 6 V1 ---- */

export interface CapacityRow {
  person_id: string;
  name: string;
  weekly_hours: number;
  threshold_pct: number;
  allocated_hours: number;
  utilisation_pct: number;
  over_threshold: boolean;
  skills: { name: string; level: number }[];
}

export async function capacity(email: string | null) {
  return api<CapacityRow[]>('/capacity', email);
}

export interface SkillCoverageRow {
  skill: string;
  holders: number;
  avg_level: number;
  demand_hours: number;
}

export async function skillCoverage(email: string | null) {
  return api<SkillCoverageRow[]>('/capacity/skills', email);
}

export interface UtilisationRow {
  person_id: string;
  name: string;
  logged_hours: number;
  weekly_hours: number;
  utilisation_pct: number;
}

export async function utilisation(email: string | null) {
  return api<UtilisationRow[]>('/reports/utilisation', email);
}

export interface ProjectEffortRow {
  project_id: string;
  title: string;
  status: string;
  estimated_hours: number;
  logged_hours: number;
  variance_hours: number;
}

export async function projectEffort(email: string | null) {
  return api<ProjectEffortRow[]>('/reports/effort', email);
}

export interface PortfolioRow {
  status: string;
  projects: number;
  open_tasks: number;
  estimated_hours: number;
}

export async function portfolio(email: string | null) {
  return api<PortfolioRow[]>('/reports/portfolio', email);
}

export interface SlaRow {
  project_id: string;
  title: string;
  task_id: string;
  task_title: string;
  sla_target: string;
  due_date: string | null;
  status: string;
  breached: boolean;
}

export async function slaReport(email: string | null) {
  return api<SlaRow[]>('/reports/sla', email);
}

export interface IntegrationRow {
  id: string;
  name: string;
  target_url: string;
  event: string;
  active: boolean;
  created_at: string;
}

export async function integrations(email: string | null) {
  return api<IntegrationRow[]>('/integrations', email);
}

export interface SsoConfigRow {
  id: string;
  issuer: string;
  client_id: string;
  mfa_required: boolean;
  created_at: string;
}

export async function ssoConfigs(email: string | null) {
  return api<SsoConfigRow[]>('/identity/sso', email);
}

/* ---- Phase 6 ops ---- */

export interface BudgetRow {
  project_id: string;
  name: string;
  po_number: string | null;
  budget_amount: number | null;
  approved_hours: number;
  approved_amount: number;
  logged_hours: number;
  logged_value: number;
  blended_rate: number;
}

export async function budgetVsEffort(email: string | null, projectId: string) {
  return api<BudgetRow>(`/commercial/projects/${projectId}/budget`, email);
}

export interface InvoiceReadyRow {
  id: string;
  name: string;
  status: string;
  invoice_amount: string | null;
  target_date: string | null;
  project_id: string;
  project_name: string;
  po_number: string | null;
}

export async function invoiceReady(email: string | null) {
  return api<InvoiceReadyRow[]>('/commercial/invoice-ready', email);
}

export interface RateCardRow {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  entries: { role: string; skill: string | null; hourly_rate: string }[];
}

export async function rateCards(email: string | null) {
  return api<RateCardRow[]>('/commercial/rate-cards', email);
}

export interface AuditEventRow {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  at: string;
}

export async function auditSearch(email: string | null, params: Record<string, string>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return api<AuditEventRow[]>(`/audit${qs ? `?${qs}` : ''}`, email);
}

export interface AutomationRuleRow {
  id: string;
  name: string;
  trigger_event: string;
  condition: unknown[];
  action: { type: string; message?: string };
  active: boolean;
}

export async function automations(email: string | null) {
  return api<AutomationRuleRow[]>('/automations', email);
}

export interface AssetRow {
  id: string;
  key: string;
  content_type: string;
  size_bytes: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function assets(email: string | null) {
  return api<AssetRow[]>('/assets', email);
}
