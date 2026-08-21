# Work Hierarchy — Palette Canvas Workspace

The planning document requires this hierarchy to avoid the
“kanban-card-carries-commercial-and-creative-meaning” anti-pattern:

Organisation
  ├── Agency/Client Account
  │     ├── Brand
  │     └── Workspace
  │            ├── Project / Service Order
  │            │      ├── Workstream
  │            │      │      ├── Deliverable
  │            │      │      │      ├── Task
  │            │      │      │      └── Proof / Asset / Decision
  │            │      └── (project-agnostic records: briefs, brief forms)
  │            └── (project-agnostic records: briefs, brief forms)
  └── (controls: permissions, audit, tenant retention)

---

## Design intent

- **Organisation** — top-level tenancy boundary
- **Agency/Client Account** — partner relationships and their permitted brands
- **Brand** — the deliverable object; confidentiality tier applies here
- **Workspace** — scoped unit of access (Internal/Agency/Client/Restricted)
- **Project / Service Order** — structured intake + template-driven lifecycle
- **Workstream** — decomposition inside a project (production, QA, client, etc.)
- **Deliverable** — the artefact with a versioned manifest
- **Task** — actionable work, checklist, dependencies, SLA target
- **Proof / Asset / Decision** — versioned creative file, review artefact, or auditable decision

Each level carries its own access, audit, and lifecycle semantics;
the platform enforces them end-to-end rather than relying on conventions.
