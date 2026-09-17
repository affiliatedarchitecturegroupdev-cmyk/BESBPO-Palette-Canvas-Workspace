import {
  Role,
  VisibilityLevel,
  UserContext,
  canSeeVisibility,
  Capability,
  can,
  capabilitiesOf,
  SEAT_MODEL,
  seatUtilisationPct,
  COLUMN_TYPES,
  SEMANTIC_ROLES,
  QA_GATE_ROLES,
  SYSTEM_COLUMN_TYPES,
  AGENT_CATALOG,
  AgentAutonomy,
} from '../src';

function ctx(roles: Role[], visibilityScope: VisibilityLevel[]): UserContext {
  return {
    userId: 'u1',
    orgId: 'org1',
    roles,
    scopes: visibilityScope.map((v) => ({ workspaceId: 'demo', visibility: v })),
  };
}

// Platform owner sees everything
{
  const user = ctx([Role.PlatformOwner], []);
  if (!canSeeVisibility(user, VisibilityLevel.Internal)) {
    throw new Error('Platform owner should see internal');
  }
}

// Client approver cannot see Internal
{
  const user = ctx([Role.ClientApprover], [VisibilityLevel.ClientShared]);
  if (canSeeVisibility(user, VisibilityLevel.Internal)) {
    throw new Error('Client approver must not see internal');
  }
}

// Vendor has no portfolio discovery — restricted third party requires explicit scope
{
  const user = ctx([Role.ThirdPartyVendor], []);
  if (canSeeVisibility(user, VisibilityLevel.RestrictedThirdParty)) {
    throw new Error('Vendor must need explicit scope');
  }
}

// Client approver sees client-shared only when scoped
{
  const user = ctx([Role.ClientApprover], [VisibilityLevel.ClientShared]);
  if (!canSeeVisibility(user, VisibilityLevel.ClientShared)) {
    throw new Error('Scoped client approver should see client-shared');
  }
}

/* Phase 2 capability matrix checks */

// Roles without manage capabilities
{
  if (can([Role.ClientApprover], Capability.IntakeTriage)) {
    throw new Error('client approver must not triage');
  }
}
{
  if (can([Role.ThirdPartyVendor], Capability.AuditRead)) {
    throw new Error('vendor must not read audit');
  }
}
{
  if (!can([Role.AccountManager], Capability.IntakeConvert)) {
    throw new Error('account manager must convert briefs');
  }
}
{
  const caps = capabilitiesOf([Role.ClientApprover]);
  if (!caps.includes(Capability.CommentsWrite) ||
      !caps.includes(Capability.NotificationsRead) || !caps.includes(Capability.ApprovalsDecide) ||
      !caps.includes(Capability.DeliverablesRead)) {
    throw new Error('client approver has projects.read + deliverables.read + comments.write + notifications.read + approvals.decide');
  }
  // V2 §14.3: Client reads boards/items/dashboards/files for its own
  // engagement and writes on external channels only.
  if (!caps.includes(Capability.BoardsRead) || !caps.includes(Capability.ItemsRead) ||
      !caps.includes(Capability.DashboardsRead) || !caps.includes(Capability.FilesRead) ||
      !caps.includes(Capability.ChannelsWrite)) {
    throw new Error('client approver gains V2 board/dashboard/channel read access (§14.3)');
  }
  // Client is never given structural write on boards or items.
  if (caps.includes(Capability.BoardsWrite) || caps.includes(Capability.ItemsWrite) ||
      caps.includes(Capability.DashboardsManage)) {
    throw new Error('client approver must not hold structural write (boards/items/dashboards)');
  }
}
{
  // V2 §14.3: Guest is the narrowest tier — comment on and meet about the one
  // scoped item, read it, and nothing structural.
  const caps = capabilitiesOf([Role.Guest]);
  if (!caps.includes(Capability.CommentsWrite) || !caps.includes(Capability.MeetingsWrite) ||
      !caps.includes(Capability.DeliverablesRead)) {
    throw new Error('guest may comment on and meet about its scoped item');
  }
  if (caps.includes(Capability.BoardsRead) || caps.includes(Capability.ItemsRead) ||
      caps.includes(Capability.ItemsWrite) || caps.includes(Capability.BoardsWrite) ||
      caps.includes(Capability.CommercialRead) || caps.includes(Capability.CapacityRead) ||
      caps.includes(Capability.FilesWrite)) {
    throw new Error('guest must not see boards, capacity, commercial or write files');
  }
}
{
  // V2 §14.3 explicit callout: Management is read-only on working content —
  // full oversight of channels/files, but never editing them.
  const caps = capabilitiesOf([Role.OperationsDirector]);
  if (!caps.includes(Capability.ChannelsRead) || !caps.includes(Capability.FilesRead)) {
    throw new Error('management reads communication + files for oversight');
  }
  if (caps.includes(Capability.ChannelsWrite) || caps.includes(Capability.FilesWrite)) {
    throw new Error('management must not write partner channels or designer files (§14.3)');
  }
  if (!caps.includes(Capability.BoardsManage) || !caps.includes(Capability.DashboardsManage) ||
      !caps.includes(Capability.CapacityWrite)) {
    throw new Error('management write access is confined to structural/administrative resources');
  }
}
{
  // V2 §7.7 seat model: the benchmarked figures must reconcile.
  const { rawMonthlyHours, nonBillablePct, productiveMonthlyHours } = SEAT_MODEL;
  const derived = rawMonthlyHours * (1 - nonBillablePct);
  if (Math.abs(derived - productiveMonthlyHours) > 0.05) {
    throw new Error(`seat model does not reconcile: ${derived} != ${productiveMonthlyHours}`);
  }
  const pct = seatUtilisationPct(137.1);
  if (pct !== 100) {
    throw new Error(`137.1 productive hours must read as 100% utilisation, got ${pct}`);
  }
  if (seatUtilisationPct(68.55) !== 50) {
    throw new Error('half the productive ceiling must read as 50% utilisation');
  }
  if (seatUtilisationPct(0) !== 0) {
    throw new Error('zero logged hours must read as 0% utilisation');
  }
  if (SEAT_MODEL.accountManagerSeats !== 12) {
    throw new Error('account manager bounded-broad ratio must be 12 seats');
  }
}
{
  // V2 §9.4/§10.2 vocabulary shapes.
  if (COLUMN_TYPES.length !== 25) {
    throw new Error(`column type catalog must hold 25 types, got ${COLUMN_TYPES.length}`);
  }
  if (SEMANTIC_ROLES.length !== 9) {
    throw new Error(`semantic role vocabulary must hold 9 roles, got ${SEMANTIC_ROLES.length}`);
  }
  if (QA_GATE_ROLES.length !== 3) {
    throw new Error('QA gate is exactly three checks (brand/brief/technical)');
  }
  if (SYSTEM_COLUMN_TYPES.length !== 2) {
    throw new Error('creation_log + last_updated are the only system columns');
  }
}
{
  // V2 §12.2: no agent is ever the final word on quality or compliance.
  if (AGENT_CATALOG.length !== 6) {
    throw new Error(`agent catalog must hold 6 agents, got ${AGENT_CATALOG.length}`);
  }
  if (!AGENT_CATALOG.every((a) => a.key && a.name && a.autonomy)) {
    throw new Error('every agent declares a key, name and autonomy level');
  }
  // Only the reminder agent may act without approval; the guard blocks but
  // cannot itself approve.
  const noApproval = AGENT_CATALOG.filter((a) => !a.requiresApproval).map((a) => a.key);
  if (noApproval.length !== 1 || noApproval[0] !== 'kpi_reminder') {
    throw new Error('only the act-and-log reminder agent skips human approval');
  }
  const guard = AGENT_CATALOG.find((a) => a.key === 'white_label_guard');
  if (!guard || guard.autonomy !== AgentAutonomy.BlockAndFlag) {
    throw new Error('the White-Label Compliance Guard is block-and-flag');
  }
}

/* Phase 3 capability matrix checks */

// Internal production roles write tasks; external roles do not
{
  if (!can([Role.CreativeContributor], Capability.TasksWrite)) {
    throw new Error('creative contributor must write tasks');
  }
  if (can([Role.ClientApprover], Capability.TasksWrite)) {
    throw new Error('client approver must not write tasks');
  }
  if (can([Role.AgencyAdmin], Capability.TasksWrite)) {
    throw new Error('agency admin must not write tasks');
  }
}

// Workload visibility: leadership + finance only
{
  if (!can([Role.OperationsDirector], Capability.WorkloadRead) || !can([Role.FinanceUser], Capability.WorkloadRead)) {
    throw new Error('ops + finance must read workload');
  }
  if (can([Role.CreativeContributor], Capability.WorkloadRead)) {
    throw new Error('creative contributor must not read workload');
  }
}

// Only internal review roles resolve comments
{
  if (!can([Role.QualityReviewer], Capability.CommentsResolve)) {
    throw new Error('quality reviewer must resolve comments');
  }
  if (can([Role.ClientApprover], Capability.CommentsResolve)) {
    throw new Error('client approver must not resolve comments');
  }
}

/* Phase 4 capability matrix checks */

// Version write: creative contributors + leads + ops; QA/AM must not upload versions
{
  if (!can([Role.CreativeContributor], Capability.VersionsWrite)) {
    throw new Error('creative contributor must write versions');
  }
  if (can([Role.QualityReviewer], Capability.VersionsWrite) || can([Role.AccountManager], Capability.VersionsWrite)) {
    throw new Error('non-creative-internal must not write versions');
  }
}

// Approval request: account manager + ops only; decision: client approver only
{
  if (!can([Role.AccountManager], Capability.ApprovalsRequest)) {
    throw new Error('account manager must request approvals');
  }
  if (can([Role.QualityReviewer], Capability.ApprovalsRequest) || can([Role.CreativeContributor], Capability.ApprovalsRequest)) {
    throw new Error('production/QA must not request external approval');
  }
  if (!can([Role.ClientApprover], Capability.ApprovalsDecide)) {
    throw new Error('client approver must decide approvals');
  }
  if (can([Role.AccountManager], Capability.ApprovalsDecide) || can([Role.ProductionLead], Capability.ApprovalsDecide)) {
    throw new Error('internal roles must not decide client approvals');
  }
}

// QA checklist write: quality reviewer + ops only
{
  if (!can([Role.QualityReviewer], Capability.QaWrite) || !can([Role.OperationsDirector], Capability.QaWrite)) {
    throw new Error('QA reviewer + ops must write QA checklists');
  }
  if (can([Role.CreativeContributor], Capability.QaWrite)) {
    throw new Error('creative contributor must not write QA checklists');
  }
}

// Change control write: account manager + ops only
{
  if (!can([Role.AccountManager], Capability.ChangeWrite)) {
    throw new Error('account manager must write change requests');
  }
  if (can([Role.CreativeContributor], Capability.ChangeWrite) || can([Role.ClientApprover], Capability.ChangeWrite)) {
    throw new Error('non-commercial roles must not write change requests');
  }
}

// Handover write: production lead + ops only
{
  if (!can([Role.ProductionLead], Capability.HandoverWrite)) {
    throw new Error('production lead must write handover');
  }
  if (can([Role.ClientApprover], Capability.HandoverWrite) || can([Role.AgencyContributor], Capability.HandoverWrite)) {
    throw new Error('external roles must not write handover');
  }
}
/* Phase 7 capability matrix checks */

// Invites: ops + account managers administer; clients/vendors may accept
{
  if (!can([Role.OperationsDirector], Capability.InvitesManage) || !can([Role.AccountManager], Capability.InvitesManage)) {

    throw new Error('ops + AM must administer invites');

  }

  if (can([Role.AgencyContributor], Capability.InvitesManage) || can([Role.ThirdPartyVendor], Capability.InvitesManage)) {

    throw new Error('external roles must not administer invites');

  }

}

// Confidentiality tiers are ops-only manage
{
  if (!can([Role.OperationsDirector], Capability.TiersManage)) {

    throw new Error('ops must manage confidentiality tiers');

  }

  if (can([Role.CreativeContributor], Capability.TiersManage)) {

    throw new Error('contributors must not manage tiers');

  }

}

// Recurrence + saved views: production ops only
{
  if (!can([Role.ProductionLead], Capability.RecurrenceManage) || !can([Role.ProductionLead], Capability.ViewsManage)) {


    throw new Error('production lead must manage recurrence + views');

  }

  if (can([Role.ClientApprover], Capability.RecurrenceManage) || can([Role.ClientApprover], Capability.ViewsManage)) {

    throw new Error('client approver must not manage recurrence or views');

  }

}

// Reactions + comment assets open to commenters
{
  if (!can([Role.CreativeContributor], Capability.ReactionsWrite)) {

    throw new Error('commenters must react');

  }

  if (!can([Role.ClientApprover], Capability.ReactionsWrite)) {

    throw new Error('client approver must react');

  }

}

// Message-to-task available to production roles
{
  if (!can([Role.CreativeContributor], Capability.MessageToTask)) {

    throw new Error('creative contributor must convert messages to tasks');

  }

  if (can([Role.AgencyContributor], Capability.MessageToTask)) {

    throw new Error('agency contributor must not convert messages');

  }

}

// Approval steps + technical checks: ops + production lead
{
  if (!can([Role.OperationsDirector], Capability.ApprovalStepsWrite) || !can([Role.ProductionLead], Capability.TechnicalChecksWrite)) {

    throw new Error('ops + lead must write approval steps + technical checks');

  }

}

// Exports: ops + finance;deep-dive reports: ops + finance
{
  if (!can([Role.FinanceUser], Capability.ExportsManage) || !can([Role.FinanceUser], Capability.ReportsDeepDive)) {

    throw new Error('finance must export + read deep-dive reports');

  }

}

// N2.4: reading the schedule is a separate grant from booking it.
{
  if (!can([Role.QualityReviewer], Capability.MeetingsRead)) {
    throw new Error('quality reviewer must read the meeting schedule');
  }
  if (can([Role.QualityReviewer], Capability.MeetingsWrite)) {
    throw new Error('quality reviewer must not book meetings');
  }
  if (can([Role.ThirdPartyVendor], Capability.MeetingsRead)) {
    throw new Error('vendor has no schedule access');
  }
  if (!can([Role.ClientApprover], Capability.MeetingsRead) ||
      !can([Role.ClientApprover], Capability.MeetingsWrite)) {
    throw new Error('client may read and book meetings on its engagement');
  }
  // Every role that may book must also be able to read the schedule back.
  for (const role of Object.values(Role)) {
    if (can([role], Capability.MeetingsWrite) && !can([role], Capability.MeetingsRead)) {
      throw new Error(`${role} can book a meeting it cannot read back`);
    }
  }
}

// N2.3: the nav gates /comms and /meetings on `channels.read` and
// `meetings.read`. That makes the capability matrix load-bearing for whether a
// person can reach the V2 comms surface at all, so pin the roles it hinges on
// here rather than discovering a silently-empty page later.
{
  if (!can([Role.ProductionLead], Capability.ChannelsRead) ||
      !can([Role.ProductionLead], Capability.ChannelsWrite)) {
    throw new Error('production lead must read and write channels');
  }
  // The reviewer reads conversation without being able to post to it.
  if (!can([Role.QualityReviewer], Capability.ChannelsRead)) {
    throw new Error('quality reviewer must read channels');
  }
  if (can([Role.QualityReviewer], Capability.ChannelsWrite)) {
    throw new Error('quality reviewer must not post to channels');
  }
  if (can([Role.ThirdPartyVendor], Capability.ChannelsRead)) {
    throw new Error('vendor has no channel access');
  }
  if (!can([Role.ClientApprover], Capability.ChannelsRead)) {
    throw new Error('client may read the channels it can see');
  }
  if (!can([Role.Guest], Capability.MeetingsRead)) {
    throw new Error('a guest may reach its own meeting');
  }
  if (can([Role.Guest], Capability.ChannelsRead)) {
    throw new Error('a guest never reaches the channel list');
  }
  // A role that can post to a channel must be able to read the list that
  // reaches it, or the composer is unreachable.
  for (const role of Object.values(Role)) {
    if (can([role], Capability.ChannelsWrite) && !can([role], Capability.ChannelsRead)) {
      throw new Error(`${role} can post to a channel it cannot list`);
    }
  }
}

console.log('permission tests passed');
