import { api } from './api';

/* Phase 4: proofing, approvals, handover */

export interface Version {
  id: string;
  deliverable_id: string;
  version: number;
  label: string;
  uri: string;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
}
export interface QaItem {
  id: string;
  label: string;
  kind: string;
  passed: boolean;
  note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}
export async function versions(email: string | null, deliverableId: string) {
  return api<Version[]>(`/proofing/versions/${deliverableId}`, email);
}
export async function qa(email: string | null, versionId: string) {
  return api<QaItem[]>(`/proofing/versions/${versionId}/qa`, email);
}

export interface Approval {
  id: string;
  version_id: string;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_note: string | null;
  due_at: string | null;
  superseded_by: string | null;
}
export async function approvals(email: string | null, versionId: string) {
  return api<Approval[]>(`/proofing/approvals/${versionId}`, email);
}

export interface ChangeRequest {
  id: string;
  project_id: string;
  approval_id: string | null;
  title: string;
  scope_note: string | null;
  impact_hours: number | null;
  impact_cost: number | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_by: string;
  created_at: string;
}
export async function changes(email: string | null, projectId: string) {
  return api<ChangeRequest[]>(`/proofing/projects/${projectId}/changes`, email);
}

export interface HandoverItem {
  id: string;
  version_id: string;
  licence: string | null;
  source_included: boolean;
  notes: string | null;
  label: string;
  version: number;
}
export interface Handover {
  id: string;
  project_id: string;
  title: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  items: HandoverItem[];
}
export async function handover(email: string | null, projectId: string) {
  return api<Handover | null>(`/proofing/projects/${projectId}/handover`, email);
}
