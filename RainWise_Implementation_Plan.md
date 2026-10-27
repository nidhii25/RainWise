# RainWise Implementation Plan

**Purpose:** Plan the first web-based implementation of RainWise before building it.

**Product context:** This plan follows the project handoff in `RainWise_Project_Plan_and_Developer_Handoff.md`. That handoff is product context; the stack and sequencing below are the implementation plan for this project.

**Status:** Superseded. This v1 plan assumed organization tenancy, company roles, and review workflows. The active plan is [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md), which uses individual login-based accounts. This file is retained for history only.

## 1. Product outcome

Build a web application for authorized staff to register properties, complete and save field assessments, calculate transparent preliminary rooftop runoff results, review site-specific options where approved engineering rules permit, and generate versioned reports. Users must be able to return later and see the same property, its assessment history, evidence, calculations, and reports.

RainWise is decision support. It must preserve unknowns and communicate assumptions. It must not claim professional approval or recharge suitability without adequate evidence and reviewed rules.

## 2. Recommended stack

| Area | Recommendation | Why |
| --- | --- | --- |
| Web frontend | Next.js with TypeScript | Responsive field workflow, dashboards, property pages, and results views in one web app. |
| API/backend | FastAPI with Python and Pydantic | Typed API contracts and a good fit for separately documented engineering calculations. |
| Primary database | PostgreSQL | Durable relational records, transactions, constraints, and a strong migration ecosystem. |
| Spatial data | PostGIS extension for PostgreSQL | Add when storing/querying property and roof geometries; allows a coherent path for mapping without a separate GIS database. |
| ORM/migrations | SQLAlchemy 2.x and Alembic | Backend-owned data access and schema migration history. |
| File storage | Private S3-compatible object storage in deployed environments; local filesystem for simple development, or MinIO if local S3 behavior is needed | Keep photographs and PDFs out of public web paths and out of database blobs. Access through authorized backend endpoints or short-lived signed URLs. |
| Authentication | Start with a managed identity provider that supports OIDC, if deployment/account constraints allow; FastAPI validates tokens and performs application authorization | Avoid building password security and recovery from scratch. Choose provider before implementation; keep tenant/role checks in backend. |
| PDF generation | Backend report service using HTML templates and a maintained HTML-to-PDF renderer | Report content is assembled from a fixed assessment/calculation version and can be archived. Select and validate the renderer during the report spike. |
| Local environment | Docker Compose for PostgreSQL/PostGIS and optional MinIO; separate frontend and backend development servers | Repeatable setup without requiring a production deployment platform decision. |

**Database recommendation:** PostgreSQL is the system of record. Add PostGIS from the start if roof/property polygons are part of the initial data model; otherwise enable it when the map milestone begins. Keep source geometry, coordinate reference system, measurement method, and confidence/provenance with the geometry. Do not infer subsurface conditions from a map.

**Authentication boundary:** The frontend may control navigation and display, but FastAPI must enforce access for every record and file operation. Do not trust company, role, user, property, or assessment identifiers received from the browser without checking the signed-in identity and database relationships.

## 3. Architecture and data flow

```text
Browser
  └── Next.js UI (forms, register, results, reports)
        └── HTTPS API calls
              └── FastAPI (identity validation, authorization, services)
                    ├── PostgreSQL/PostGIS (records, provenance, versions)
                    ├── Private object storage (photos, generated PDFs)
                    └── Engineering package (deterministic calculations)
```

Keep engineering calculations independent from HTTP routes, database persistence, and UI rendering. An API service should validate an assessment snapshot, invoke a versioned calculation method, persist the inputs/outputs/method version, and return a typed response. Reports should refer to a specific immutable calculation run and assessment version.

## 4. Core records to plan for

- **Organization** and **User / organization membership / role**: the user identity is distinct from their company membership.
- **Property**: stable site identity, company ownership, display code, address, location, and building summary.
- **Assessment**: one site visit/evaluation linked to one property; status, visit metadata, author, and version/history.
- **Survey data**: structured sections and repeatable roof segments; decide normalized tables versus JSON only after the field schema is agreed. Keep frequently queried entities and roof segments relational.
- **Evidence file**: private object key, owner assessment, uploader, media metadata, and access policy. Never store public bucket URLs as authorization.
- **Calculation run**: immutable input snapshot, outputs, warnings, units, methodology version, provenance, and timestamp.
- **Design option**: supported option, eligibility state/reasons, dimensions, assumptions, and calculation run link.
- **Report**: assessment/calculation version, file key, report version, generation time, and creator.
- **Workflow/audit event**: actor, action, prior/new status, time, and reason where applicable.
- **Reference/source records**: rainfall and engineering source details, effective period, geography, citation, and provenance.

Use database foreign keys and constraints. Every company-owned record must be scoped to an organization directly or through a relationship that is checked server-side. Define deletion/retention rules before enabling destructive operations; historical assessments and issued reports should not be silently overwritten.

## 5. Step-by-step implementation plan

### Step 0 - Confirm product and engineering decisions

**Status:** In progress

**Work**
- [x] Make the app available for use by any company; it is not tied to one preselected organization.
- [x] Use login accounts to retain assessment history. Each account sees its own saved places and assessments; other accounts cannot access them.
- [x] Allow anyone to create an account with an email address; no company invitation or approval is required.
- [x] Keep company administration, reviewer roles, and team sharing out of the initial release; revisit if shared company records are needed later.
- [x] Include both rooftop rainwater harvesting and preliminary artificial recharge assessment in the MVP scope.
- [x] Use the full handoff survey (Sections A-J) as the MVP field-schema baseline, adapted to account-owned records and explicit unknown values.
- [ ] Finalize field-level required/optional rules, units, validation, and which missing values block each calculation.
- [ ] With an engineering advisor, choose one documented rooftop runoff method and worked examples. Identify the rainfall source and permitted assumptions.
- [x] Include preliminary recharge assessment in scope. Exact criteria and sizing methods remain to be researched and validated; until then, the app must not assert suitability or invent recommendations.
- [ ] Decide first deployment environment, identity provider/sign-in method, storage provider, privacy/retention needs, and report branding.

**Deliverables**
- [x] `docs/PRODUCT_SCOPE.md`
- [ ] `docs/ENGINEERING_METHODOLOGY.md` with cited authoritative sources and worked examples
- [ ] `docs/DATA_SOURCES.md`
- [x] `docs/DECISIONS.md` recording decisions, owners, and open questions

- [ ] **Exit condition:** The initial schema, authorization model, and first calculation can be implemented without inventing engineering rules.

### Step 1 — Set up the repository and local development environment

**Work**
- [x] Agree a monorepo layout: `frontend/`, `backend/`, `docs/`, and `infrastructure/`.
- [x] Create the Next.js 16 TypeScript app and FastAPI app with separate dependency manifests and environment configuration.
- [x] Add Docker Compose for PostgreSQL with PostGIS enabled. MinIO remains optional and is not configured yet.
- [x] Add `.env.example`, setup guides, health endpoints, and safe secret handling.
- [x] Configure ESLint for the frontend.
- [ ] Choose and configure a consistent formatter.
- [x] Define the `/api/v1` prefix and expose FastAPI OpenAPI docs. Align generated frontend API types when the first business endpoint is added.

- [ ] **Deliverables:** A developer can start the frontend, API, and database locally; health checks and API documentation work.

- [ ] **Exit condition:** A clean local setup can be followed from the README without relying on machine-specific secrets.

### Step 2 — Build identity, organizations, and authorization foundation

**Work**
- [ ] Integrate the selected identity provider or implement the approved authentication approach.
- [ ] Define user-to-organization membership and roles. Establish safe first-admin provisioning.
- [ ] Add FastAPI dependencies/services for current identity, organization context, role checks, and object-level permission checks.
- [ ] Add frontend login/logout and protected route behavior.
- [ ] Ensure API authorization applies to reads, writes, uploads, downloads, report generation, and workflow actions.
- [ ] Record significant access/workflow changes without storing passwords, tokens, or unnecessary sensitive values.

- [ ] **Deliverables:** Login/logout, current-user profile, protected app shell, role/tenant authorization policy.

- [ ] **Exit condition:** Unauthenticated and unauthorized API requests are rejected, including attempts to access another organization's records by changing an ID.

### Step 3 — Design and migrate the property/assessment data model

**Work**
- [ ] Create SQLAlchemy models and Alembic migrations for organizations, users/memberships, properties, assessments, and audit events.
- [ ] Generate stable database UUIDs and human-readable property codes separately.
- [ ] Represent one property with multiple independent assessments. Define assessment status transitions and submitted/history behavior.
- [ ] Add indexes for organization, property, status, assignee/creator, and timestamps.
- [ ] Decide structured survey fields and repeatable roof-segment records based on Step 0. Store units and provenance alongside values.

- [ ] **Deliverables:** Initial migrations, schema notes, seed/demo data clearly marked as synthetic.

- [ ] **Exit condition:** Property and assessment records can be created while preserving tenant scope and assessment history.

### Step 4 — Implement property register and detail pages

**Work**
- [ ] Build authorized property list with pagination, search, and useful filters.
- [ ] Build property creation with duplicate-search guidance and a generated property code.
- [ ] Build property detail with location/building summary and assessment timeline.
- [ ] Add the “start new assessment” flow without mutating earlier assessments.
- [ ] Add loading, empty, error, and unauthorized states.

- [ ] **Deliverables:** Property register, create flow, detail page, history timeline.

- [ ] **Exit condition:** Staff can create multiple properties, reopen them, and see their prior assessment history subject to permissions.

### Step 5 — Implement the field survey and evidence workflow

**Work**
- [ ] Build responsive, section-based survey forms with visible units, validation, progress, and explicit draft-save state.
- [ ] Add repeatable roof segments and the agreed property/location fields.
- [ ] Save and resume drafts; protect against accidental loss and handle retryable network errors.
- [ ] Add private photograph upload with file type/size validation and assessment association.
- [ ] Record measurement/data source and confidence where required. Preserve missing values as missing; do not silently substitute defaults.
- [ ] Keep advanced hydrogeology fields optional for saving a draft, while calculation eligibility may require specific evidence.

- [ ] **Deliverables:** New assessment flow, draft/resume, survey sections, secure evidence upload.

- [ ] **Exit condition:** An employee can save an incomplete assessment, leave, return later, and continue without losing entered data or exposing another organization's files.

### Step 6 — Build a versioned engineering calculation package

**Work**
- [ ] Implement the reviewed rooftop runoff calculation as pure Python functions with typed inputs/outputs and explicit units.
- [ ] Define formula version, assumptions, source references, rounding, validation bounds, and missing-input behavior.
- [ ] Support multiple roof surfaces/segments if required by the agreed method.
- [ ] Separate collected yield, loss assumptions, and annual/event-based analysis; do not label annual estimates as a detailed storage simulation.
- [ ] Persist each run with the exact input snapshot, outputs, warnings, method version, and source metadata.
- [ ] Add independently checked worked examples and automated calculation tests as part of implementation verification.

- [ ] **Deliverables:** Calculation module, API endpoint, methodology documentation, persisted calculation run.

- [ ] **Exit condition:** Reference examples match independent calculations; invalid or critical missing inputs produce clear errors/warnings or “insufficient data,” not guessed positive results.

### Step 7 — Present results and approved design options

**Work**
- [ ] Build a results page with yield summary, units, assumptions, provenance, warnings, and method version.
- [ ] Add charts only where source data and analysis support them.
- [ ] Add recharge feasibility states (eligible, ineligible, insufficient data, review required) only after criteria are approved.
- [ ] Add one reviewed candidate design at a time; draw dimensions from persisted calculation outputs.
- [ ] Add an interactive map/geometry editor when location and polygon requirements are agreed. Label data sources and spatial limitations.

- [ ] **Deliverables:** Results dashboard, explanations, initial data-driven schematic; map/design views as scoped.

- [ ] **Exit condition:** Displayed numbers and diagram dimensions match the stored calculation/design record, and unsupported options are not presented as recommendations.

### Step 8 — Generate reports and support review workflow

**Work**
- [ ] Define report template, branding, language, units, source citations, disclaimers, and sign-off fields.
- [ ] Generate a PDF from a specific assessment and calculation version; store it privately.
- [ ] Add report version records so regeneration does not erase issued artifacts.
- [ ] Add submit/review/return/approve workflow if included in MVP, with backend state-transition rules and audit events.
- [ ] Enforce access checks for previews and downloads.

- [ ] **Deliverables:** PDF generation, private report storage, report history, review queue/actions if scoped.

- [ ] **Exit condition:** A historical report remains reproducible and unchanged after a later assessment or calculation is created.

### Step 9 — Validate, secure, deploy, and hand off

**Work**
- [ ] Perform independent engineering review of formulas, criteria, and sample outputs.
- [ ] Verify tenant and object-level authorization, file privacy, validation, session behavior, and audit requirements.
- [ ] Check responsive field use, accessibility basics, report rendering, backups, and restore procedure.
- [ ] Configure deployment, HTTPS, secret management, database migrations, private object storage, monitoring, and backups.
- [ ] Prepare user instructions and developer runbook; label synthetic demo records.

- [ ] **Deliverables:** Release candidate, deployment/runbook documentation, validation record, known limitations.

- [ ] **Exit condition:** The vertical slice works end to end in the target environment, access boundaries are verified, and the engineering advisor has reviewed the included methods.

## 6. Suggested MVP boundary

Prioritize this end-to-end slice:

1. Staff authentication and company-scoped access.
2. Property creation, register, detail, and assessment history.
3. Basic survey with roof segments, rainfall/source details, and private photos.
4. Draft save/resume.
5. Reviewed preliminary rooftop runoff calculation with missing-data handling.
6. Results view with assumptions and warnings.
7. Versioned PDF report and private download.
8. Reopen property, assessment, calculation, and report later.

Treat advanced hydrogeological datasets, automated roof detection, offline synchronization, broad GIS layers, complex storage simulation, extensive cost estimation, and multiple structure families as later scope unless the project supervisor explicitly includes them and the required methodology/data is available.

## 7. Proposed initial repository structure

```text
rainwise/
  README.md
  .env.example
  docs/
    IMPLEMENTATION_PLAN.md
    PRODUCT_SCOPE.md
    ENGINEERING_METHODOLOGY.md
    DATA_SOURCES.md
    DECISIONS.md
    SECURITY.md
  frontend/
    src/
      app/
      components/
      features/
      lib/
      types/
  backend/
    app/
      api/
      core/
      db/
      models/
      schemas/
      repositories/
      services/
      engineering/
      reports/
    migrations/
  infrastructure/
    docker-compose.yml
```

Adjust the layout to existing repository conventions if implementation begins in a pre-existing codebase.

## 8. Project working rules

- Keep engineering calculations deterministic, documented, and separate from frontend presentation.
- Store units, provenance, assumptions, and methodology version with meaningful measurements and outputs.
- Do not overwrite historical assessment, calculation, or issued report data.
- Treat unknown data as unknown; missing critical evidence cannot become a positive suitability result.
- Keep all user/company authorization on the backend and check access at object level.
- Protect photographs and reports with private storage and authorized access.
- Build one vertical slice before expanding the feature set.
- Use synthetic data only when clearly labeled.
- Do not represent workflow approval as professional certification.

## 9. Open decisions before implementation

1. One company for the first deployment, or multiple companies from day one?
2. What may field employees access: assigned/created properties or all company records?
3. Which identity provider and deployment environment are available?
4. Which fields and measurements are mandatory for the first survey and calculation?
5. Which rainfall source and engineering references are approved for the initial geography?
6. Is recharge feasibility/design sizing part of the MVP, and what exact reviewed method is supported?
7. Are map polygons and roof-area drawing needed in the first release?
8. Which report language, branding, units, and review/sign-off fields are required?
9. What privacy, retention, backup, and expected-volume requirements apply?

These decisions should be recorded in `docs/DECISIONS.md`. Work on repository setup and low-risk UI scaffolding can proceed while decisions are resolved, but do not hard-code unresolved engineering thresholds or tenant policies.
