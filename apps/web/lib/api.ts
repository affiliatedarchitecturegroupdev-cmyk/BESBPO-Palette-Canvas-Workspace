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

async function api<T>(path: string, email: string | null): Promise<T | { error: string }> {
  if (!email) return { error: 'not signed in' };
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'x-user-email': email },
      cache: 'no-store',
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
