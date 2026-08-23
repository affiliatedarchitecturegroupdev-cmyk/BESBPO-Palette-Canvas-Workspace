-- Phase 3 schema: production workspace (tasks, boards, deliverables,
-- comments, notifications, workload basics).
-- Entity names follow the planning document hierarchy:
-- Brand → Workspace → Project → Workstream → Deliverable → Task.

-- Workstreams group deliverables inside a project (e.g. "Logo", "Launch batch").
CREATE TABLE IF NOT EXISTS workstream (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workstream_project_idx ON workstream (project_id);

-- Deliverables: the client-visible units of creative output per a workstream.
CREATE TABLE IF NOT EXISTS deliverable (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisation(id),
  project_id    TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  workstream_id TEXT REFERENCES workstream(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  deliverable_type TEXT NOT NULL DEFAULT 'generic',
  status        TEXT NOT NULL DEFAULT 'open', -- open | in_progress | internal_review | client_review | approved
  due_date      TEXT,
  assignee_id   TEXT REFERENCES person(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deliverable_project_idx ON deliverable (project_id, status);

-- Tasks: the smallest schedulable unit. Board columns come from the project
-- template definition (status string) rather than a fixed to-do/doing/done.
CREATE TABLE IF NOT EXISTS task (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES organisation(id),
  project_id      TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  workstream_id   TEXT REFERENCES workstream(id) ON DELETE SET NULL,
  deliverable_id  TEXT REFERENCES deliverable(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'backlog', -- column key; template-defined
  priority        TEXT NOT NULL DEFAULT 'normal',  -- low | normal | high | urgent
  assignee_id     TEXT REFERENCES person(id),
  due_date        TEXT,
  estimate_hours  NUMERIC,
  sla_target      TEXT,                            -- ISO-8601 duration or gate name
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  position        INTEGER NOT NULL DEFAULT 0,      -- board ordering
  created_by      TEXT NOT NULL REFERENCES person(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_project_status_idx ON task (project_id, status, position);
CREATE INDEX IF NOT EXISTS task_assignee_idx ON task (assignee_id, status);

CREATE TABLE IF NOT EXISTS task_collaborator (
  task_id    TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES person(id),
  PRIMARY KEY (task_id, person_id)
);

-- finish-to-start dependencies; a task cannot move to `done` while a
-- blocking dependency is unfinished (checked in service layer).
CREATE TABLE IF NOT EXISTS task_dependency (
  task_id      TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  depends_on   TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on),
  CHECK (task_id <> depends_on)
);

CREATE TABLE IF NOT EXISTS task_checklist (
  id      TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  done    BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0
);

-- Context-linked comments per the planning doc's communication rule:
-- material decisions stay attached to their work item.
CREATE TABLE IF NOT EXISTS comment (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisation(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('project','task','deliverable','brief')),
  target_id   TEXT NOT NULL,
  body        TEXT NOT NULL,
  mentions    JSONB NOT NULL DEFAULT '[]', -- [person_id]
  created_by  TEXT NOT NULL REFERENCES person(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS comment_target_idx ON comment (target_type, target_id);

-- Notification inbox: assignment, mention, status-change, deadline events.
CREATE TABLE IF NOT EXISTS notification (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  recipient_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,  -- task_assigned | mentioned | status_changed | due_soon
  target_type TEXT NOT NULL,
  target_id  TEXT NOT NULL,
  message    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_recipient_idx ON notification (recipient_id, read_at);

-- Time/effort records backing workload basics (Phase 6 adds sophisticated capacity).
CREATE TABLE IF NOT EXISTS time_entry (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL REFERENCES organisation(id),
  task_id    TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES person(id),
  hours      NUMERIC NOT NULL CHECK (hours > 0),
  note       TEXT NOT NULL DEFAULT '',
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_entry_person_idx ON time_entry (person_id, logged_at);
