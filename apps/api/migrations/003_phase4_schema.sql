-- Phase 4 schema: proofing, approvals, and handover.
-- Version → QA gate → client approval → handover package lifecycle.

-- Versioned asset for a deliverable. A deliverable carries the client-visible
-- output; versions are the reviewable iterations of it.
CREATE TABLE IF NOT EXISTS version (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  deliverable_id TEXT NOT NULL REFERENCES deliverable(id) ON DELETE CASCADE,
  version       INT NOT NULL,
  label         TEXT NOT NULL,
  uri           TEXT NOT NULL,             -- object-storage key in Phase 6; metadata only in Phase 4
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | under_qa | in_review | changes_requested | approved | handover_ready
  created_by    TEXT NOT NULL REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, version)
);
CREATE INDEX IF NOT EXISTS version_deliverable_idx ON version (deliverable_id, status);

-- Internal QA checklist on a version: gate before client review.
CREATE TABLE IF NOT EXISTS qa_checklist (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  version_id TEXT NOT NULL REFERENCES version(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'technical', -- technical | brand | evidence
  passed     BOOLEAN NOT NULL DEFAULT false,
  note       TEXT,
  checked_by TEXT REFERENCES person(id),
  checked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS qa_checklist_version_idx ON qa_checklist (version_id, kind);

-- Approval: the request for client decision on a version (approval gate).
CREATE TABLE IF NOT EXISTS approval (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisation(id),
  version_id   TEXT NOT NULL REFERENCES version(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES person(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by   TEXT REFERENCES person(id),
  decided_at   TIMESTAMPTZ,
  decision     TEXT,                          -- approved | changes_requested
  decision_note TEXT,
  due_at       TEXT,
  superseded_by TEXT REFERENCES version(id) -- later version revenge requested feedback
);
CREATE INDEX IF NOT EXISTS approval_version_idx ON approval (version_id);
CREATE INDEX IF NOT EXISTS approval_org_idx ON approval (org_id, decision, decided_at);

-- Change request tied to an approval decision that requested changes.
CREATE TABLE IF NOT EXISTS change_request (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  approval_id TEXT REFERENCES approval(id) ON DELETE SET NULL,
  project_id  TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  scope_note  TEXT,
  impact_hours INT,
  impact_cost  INT,                          -- cents
  status      TEXT NOT NULL DEFAULT 'proposed', -- proposed | accepted | declined | superseded
  decided_by  TEXT REFERENCES person(id),
  decided_at  TIMESTAMPTZ,
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS change_request_project_idx ON change_request (project_id, status);

-- Handover package: assembled from approved versions for client delivery.
CREATE TABLE IF NOT EXISTS handover_package (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'assembling', -- assembling | ready | delivered
  created_by TEXT NOT NULL REFERENCES person(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS handover_item (
  id          TEXT PRIMARY KEY,
  package_id  TEXT NOT NULL REFERENCES handover_package(id) ON DELETE CASCADE,
  version_id  TEXT NOT NULL REFERENCES version(id),
  licence     TEXT,                            -- licence terms of the delivered asset
  source_included BOOLEAN NOT NULL DEFAULT false,
 notes      TEXT
);
CREATE INDEX IF NOT EXISTS handover_item_package_idx ON handover_item (package_id);
