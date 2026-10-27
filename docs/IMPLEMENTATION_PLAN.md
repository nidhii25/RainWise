# RainWise Implementation Plan

**Purpose:** Build RainWise as a single-user, login-based web application that turns a site visit into a transparent rooftop-harvesting and recharge assessment, a sized structure recommendation, and a visual deliverable (map, drawing, 3D model, AI concept render, PDF report).

**Status:** Active. This plan supersedes `RainWise_Implementation_Plan.md` (v1). The v1 plan assumed organization tenancy, company roles, and review workflows; that model is withdrawn. The handoff in `RainWise_Project_Plan_and_Developer_Handoff.md` remains the source for survey content and engineering caution, but its multi-company role model is out of scope.

**Product context:** Rainfall and yield are location-agnostic. The only recharge rule pack is India (CGWB 2007); other regions return `REVIEW_REQUIRED`. Engineering rules must be cited, versioned, and reviewed before the app presents them as recommendations.

**Reading this plan (updated 2026-10-28):** completed work is struck through; open items are plain. A consolidated list of what remains is in ["Remaining work at a glance"](#remaining-work-at-a-glance-2026-10-28) at the end of §11.

---

## 1. Product definition

One sentence: *Anyone can sign in, record a property and its dimensions, get transparent rooftop-yield and recharge-potential results, receive a sized structure recommendation, see the site as a map and a dimensioned 3D model plus an AI concept render, and export a report they can reopen later.*

The five pillars the product must deliver:

| # | Pillar | What the user does | What the system returns |
| --- | --- | --- | --- |
| 1 | Capture | Logs in, registers a place, enters dimensions and site observations | A saved, resumable assessment owned by that account |
| 2 | Rooftop harvesting | Confirms roof segments and rainfall period | Runoff volume, collectible volume, losses, demand match |
| 3 | Recharge potential | Records soil, infiltration, water-table, slope, constraints | A rule-by-rule feasibility result with reasons and unknowns |
| 4 | Sizing and structure | Reviews candidate structures | Recommended structure type, dimensions, capacity check |
| 5 | Visualisation | Opens the results view | Map with location, 2D dimensioned drawing, interactive 3D model, AI concept render, PDF |

**What RainWise is not:** not a certification tool, not a substitute for a hydrogeologist or a field infiltration test, not a company/team workspace, and not a system that lets an image model decide dimensions.

---

## 2. Access model

This is the defining constraint of v2.

- **Individual accounts only.** One person registers with an email address and a password. No invitations, no company approval, no tenant.
- **Everything is owned by exactly one user.** Properties, assessments, calculations, photos, renders, and reports all carry `owner_id`.
- **No organizations, memberships, roles, sharing, reviewer queues, or admin console.** These are explicitly out of scope, not "later if needed".
- **Backend enforcement is mandatory.** Every read and write filters by `owner_id = current_user.id`. Looking up another user's record by ID returns `404`, not `403`, so IDs cannot be probed.
- **One user, many places, many visits.** A user can register unlimited properties; each property can have multiple assessments over time; nothing is overwritten.
- **Optional later:** a read-only, expiring share link for a single report. Not in the MVP.

---

## 3. Scope

### In scope

1. Email + password registration, login, logout, password reset, email verification.
2. Property register with map, search, and per-property assessment history.
3. Sectioned field survey with dimensions, roof segments, rainfall provenance, soil/infiltration, groundwater, water quality, constraints, existing structures, and photos.
4. Deterministic rooftop runoff and storage-sizing engine with automated tests.
5. Deterministic recharge feasibility and structure-sizing engine driven by cited rule tables.
6. Map view with pin, drawn plot/roof polygons, satellite toggle, and measured-area calculation.
7. Parametric 2D dimensioned drawing and interactive 3D model generated from the calculation output.
8. AI concept render generated from structured parameters, labelled as illustrative.
9. Versioned PDF report with inputs, results, sources, warnings, and disclaimers.
10. Draft save/resume, mobile-friendly field use, and full history.

### Out of scope for the MVP

- Companies, teams, roles, sharing, review/approval workflow.
- Offline mode and synchronisation.
- Automatic roof detection from satellite or drone imagery.
- City-scale GIS layers, groundwater maps, or subsurface inference.
- Cost estimation and contractor quotations.
- Professional certification claims.
- Multiple language packs (English only initially).

---

## 4. Architecture

```text
Browser (Next.js, mobile-first)
  ├── MapLibre GL        map, pin, polygons, satellite
  ├── React Three Fiber  parametric 3D model
  └── SVG                dimensioned 2D drawings
        │ HTTPS / JSON + JWT
        ▼
FastAPI
  ├── auth        register, login, refresh, reset
  ├── api/v1      properties, assessments, survey, results, visuals, reports
  ├── engineering pure Python, no HTTP or DB imports
  │     ├── rooftop        runoff + losses
  │     ├── storage        monthly water balance + tank sizing
  │     ├── recharge       rule-table feasibility
  │     └── structures     pit / trench / tank / shaft sizing
  ├── visuals     scene graph builder, render job queue, AI adapter
  ├── reports     HTML -> PDF
  └── storage     private object store, signed URLs
        │
        ▼
PostgreSQL + PostGIS   users, properties, assessments, runs, assets
Private object store   photos, renders, PDFs
```

**Hard boundary:** `app/engineering/` is pure Python. It receives a validated snapshot and returns a typed result. It never imports FastAPI, SQLAlchemy, or anything from `app/api/`. This is what makes the calculations testable and defensible.

---

## 5. Data model

All tables carry `id` (UUID), `created_at`, and `updated_at` where meaningful. All user-owned tables carry `owner_id` with a foreign key to `users`.

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `users` | Account | `email` (unique), `password_hash`, `display_name`, `email_verified_at` |
| `properties` | A place | `owner_id`, `code` (`RW-000123`), `label`, `property_type`, `address`, `location` (Point 4326), `footprint` (Polygon 4326, nullable), `notes` |
| `assessments` | One visit | `property_id`, `owner_id`, `version_no`, `status` (`draft`/`submitted`/`archived`), `visit_date` |
| `roof_segments` | Repeatable catchment areas | `assessment_id`, `label`, `length_m`, `width_m`, `area_m2`, `area_method` (`measured`/`drawn`/`estimated`), `material`, `runoff_coefficient`, `slope_pct`, `condition`, `outlets` |
| `rainfall_sources` | Cited data provenance | `name`, `publisher`, `url`, `accessed_on`, `geography`, `period_type` |
| `rainfall_records` | Values used | `assessment_id`, `source_id`, `period_type`, `annual_mm`, `monthly_mm` (jsonb), `station`, `years_of_record` |
| `soil_tests` | Infiltration evidence | `assessment_id`, `method`, `infiltration_mm_per_hr`, `test_depth_m`, `soil_class`, `tested_on` |
| `groundwater_observations` | Water-table context | `assessment_id`, `depth_m`, `observed_on`, `source`, `confidence` |
| `site_constraints` | Space, access, utilities, contamination proximity | `assessment_id`, `kind`, `value`, `unit`, `note` |
| `existing_structures` | What already exists | `assessment_id`, `structure_type`, `dimensions` (jsonb), `condition`, `inspection_note` |
| `evidence_files` | Photos and documents | `assessment_id`, `owner_id`, `object_key`, `mime`, `bytes`, `kind`, `captured_at`, `gps` |
| `calculation_runs` | Immutable results | `assessment_id`, `owner_id`, `kind`, `method_id`, `method_version`, `input_snapshot` (jsonb), `outputs` (jsonb), `warnings` (jsonb) |
| `design_options` | Sized candidate | `assessment_id`, `calculation_run_id`, `structure_type`, `dimensions` (jsonb), `eligibility`, `reasons` (jsonb), `source_refs` |
| `visualizations` | Generated artefacts | `assessment_id`, `kind` (`map`/`drawing`/`model`/`ai_render`), `params` (jsonb), `asset_key`, `provider`, `model`, `prompt`, `seed` |
| `reports` | Issued PDFs | `assessment_id`, `calculation_run_id`, `design_option_id`, `version_no`, `asset_key`, `generated_at` |

**Rules:**

- `calculation_runs` and `reports` are append-only. A recalculation creates a new run; an issued report is never regenerated in place.
- Every stored measurement carries its unit and source in the same record or its parent.
- Geometry is stored in EPSG:4326. Areas are computed in a projected CRS (UTM 43N for Indore), never in degrees. **MVP:** roof areas are entered directly; CRS/polygon computation is deferred.
- Missing values are `NULL` with an explicit `unknown` flag in the survey, never `0`.

---

## 6. Engineering methods

Every method below lives in `docs/ENGINEERING_METHODOLOGY.md` with an exact source, edition, page or section, and a worked example, before it is implemented. The rule tables are versioned data files, not hard-coded thresholds.

### 6.1 Rooftop runoff

```text
V_runoff_m3 = Σ (P_mm × A_i_m2 × C_i) / 1000
```

- `P_mm` is rainfall for one stated period and one stated source. Different periods or sources are never mixed inside one run.
- `A_i` comes from measured dimensions or a drawn polygon, and the method is recorded.
- `C_i` comes from a reviewed reference keyed to roof material and condition.
- Multiple segments are summed only when they share the same rainfall period.

### 6.2 Losses, kept separate

```text
V_net_m3 = V_runoff − V_first_flush − V_filter_loss − V_conveyance_loss
```

Each term is computed and displayed separately. No aggregate efficiency factor is applied on top of itemised losses — that double-counts. The results view always shows the chain: rainfall on roof → runoff after coefficient → water reaching storage → water stored → overflow → water routed to recharge.

### 6.3 Storage sizing (this is what makes a tank size defensible)

Annual yield alone cannot size a tank. The engine runs a monthly water balance against rainfall normals and a demand assumption:

```text
available        = S_prev + I_t
overflow         = max(0, available − S_max)
stored_before_use = min(S_max, available)
actual_use       = min(D_t, stored_before_use)
S_t              = stored_before_use − actual_use
unmet_demand     = D_t − actual_use
```

The engine sweeps candidate `S_max` values, reports reliability (fraction of demand met), overflow fraction, and months empty, and recommends the smallest tank meeting a user-selected reliability target (default 80%). The time-step order (inflow before demand) is documented and tested.

### 6.4 Recharge feasibility

A rule table, evaluated criterion by criterion. Each row states: criterion, operator, threshold, unit, source citation, and what happens when the input is unknown.

Typical criteria: available runoff volume, measured infiltration rate, depth to water table, soil class, slope, available footprint, distance to contamination sources, water-quality indicators, and site constraints.

Outputs (exact vocabulary, fixed before implementation):

| Result | Meaning |
| --- | --- |
| `ELIGIBLE` | Every required criterion passed with measured evidence |
| `CONDITIONALLY_ELIGIBLE` | Passes, but requires a named follow-up (e.g. confirm water table in monsoon) |
| `NOT_ELIGIBLE` | A hard criterion failed |
| `INSUFFICIENT_DATA` | A required criterion is unknown |
| `REVIEW_REQUIRED` | Rule set cannot decide; a professional must assess |

**Non-negotiable:** a missing value never becomes a pass. Unknown is `INSUFFICIENT_DATA`, and the response lists exactly which inputs are missing and which test would resolve them.

### 6.5 Structure sizing

Each structure type has its own documented method, applicability conditions, and worked example. No generic formula is reused across types.

| Structure | Basis | Key checks |
| --- | --- | --- |
| Storage tank | `V = L × W × H`; usable volume after freeboard and dead storage | Demand match, footprint fit, overflow route |
| Recharge pit | Working volume from design-event runoff and void ratio; percolation from wetted area × infiltration rate | Infiltration capacity ≥ inflow rate; depth to water table; filter media |
| Recharge trench | Same volume basis with trench geometry | Percolation from side + base area; length available |
| Recharge shaft / well | Gated behind explicit advisor sign-off and a cited design table | Not enabled until approved |

The design event (e.g. a stated return-period daily rainfall) is a documented, configurable parameter — never an invented constant buried in code.

### 6.6 Provenance and refusal

Every run returns: inputs used, units, method id, method version, outputs, assumptions, warnings, source references, and a flag for `preliminary` vs `requires professional review`. If a critical input is missing, the engine returns `INSUFFICIENT_DATA` with the gap listed — it does not return a number with a caveat.

### 6.7 Data sources and regional rule packs

"Works for all locations" is achieved with real open data plus explicit unknowns, never with synthetic numbers.

| Input | Source | Coverage | If unavailable |
| --- | --- | --- | --- |
| Rainfall | NASA POWER monthly and climatology API (`PRECTOTCORR`), 0.5° grid, 1981–present, free, no key | Global | User enters a cited value; otherwise `INSUFFICIENT_DATA` |
| Runoff coefficient | CPWD *Rain Water Harvesting* Table 2; IS 15797:2008 range 0.8–0.95 | Global method | `INSUFFICIENT_DATA` |
| Soil texture | SoilGrids 2.0 (ISRIC), sand/silt/clay at 250 m | Global | User enters soil class |
| Infiltration rate | Measured on site by soak or double-ring test | Site | `INSUFFICIENT_DATA`; never silently inferred from texture |
| Depth to water table | User observation; India: CGWB / India-WRIS | Site / India | `INSUFFICIENT_DATA` |
| Recharge criteria and sizing | CGWB *Manual on Artificial Recharge of Ground Water* (2007), Table 5.3 and §6.2.3.3; CGWB *Guide on Artificial Recharge* (2005) | India rule pack | `REVIEW_REQUIRED` |
| Elevation and slope | Copernicus DEM or Open-Meteo elevation | Global | User enters slope |

**Regional rule packs.** Recharge rules live in versioned files keyed by region, for example `rules/in/cgwb-2007.yaml`. Each row carries a criterion, operator, threshold, unit, and citation. If no pack matches the property location, the engine returns `REVIEW_REQUIRED` and states that no approved criteria exist for that region. This keeps the application usable anywhere without pretending to hold local engineering guidance everywhere.

**Hard rule.** No AI-generated rainfall value, coefficient, threshold, or dimension ever enters a `calculation_run`. AI is used for the concept render, and optionally for a plain-language explanation of results that were already computed.

---

## 7. Visual system

Four layers, one rule: **geometry always comes from the calculation, never from the image model.**

### 7.1 Map and location

- MapLibre GL JS with OpenStreetMap raster tiles and an optional satellite layer (licence checked before deployment).
- Pin placement by search, click, or device GPS; coordinates shown and editable.
- Draw plot boundary and roof polygons; area computed in a projected CRS and labelled with method and accuracy.
- Reverse geocoding for address prefill; user edits are authoritative.
- Explicit label: *map-derived areas are approximate; measured dimensions take precedence.*

### 7.2 Dimensioned 2D drawings

- Server-generated SVG per design option: tank section, pit/trench section with filter layers, pipe route, and a plan view.
- Every dimension label is bound to a value in `design_options.dimensions`.
- Exported as PNG/SVG into the report. No decorative-only diagrams.

### 7.3 Parametric 3D model

- React Three Fiber scene built from a JSON scene graph produced by the backend:
  - site plane from the plot polygon
  - building mass from footprint + storeys
  - roof planes per `roof_segments`
  - tank, pit, or trench at their sized dimensions and proposed position
  - filter chamber, downpipes, and overflow route
  - dimension labels and a scale reference
- Orbit, zoom, toggle layers, and switch between candidate designs.
- Deterministic: same calculation run ⇒ same model. A PNG snapshot is archived with the report.

### 7.4 AI concept render

- Backend job builds a structured prompt from the design option (structure type, dimensions, materials, climate, building type, site context). It does **not** send the address, coordinates, owner name, or photos.
- Provider is Google Gemini by default, behind an adapter interface so it can be swapped without touching the results pipeline.
- Output is stored privately and labelled in the UI and report: *Illustrative concept generated from the calculated dimensions. Not to scale. Not a construction drawing.*
- The prompt, model id, and seed are stored with the asset for reproducibility.
- Per-user quota and a hard cost cap; if generation fails, the 3D snapshot is used instead.
- The render can never introduce or change a dimension. Dimensions are read from the drawing, not the image.

### 7.5 Consistency rule

A single `design_option_id` drives the drawing, the 3D model, the AI prompt, and the report. If any of them disagree, the stored calculation wins and the artifact is regenerated.

---

## 8. Reports

- HTML template rendered to PDF on the backend, from one immutable `calculation_run` + `design_option`.
- Contents: property summary, map snapshot, survey inputs with units and sources, rooftop yield chain, storage sizing result, recharge criteria table with pass/fail/unknown, structure recommendation and dimensions, 2D drawing, 3D snapshot, AI concept render (labelled), warnings, method versions, citations, and disclaimers.
- Stored privately; download via short-lived signed URL.
- Regeneration creates `version_no + 1`; previously issued reports remain downloadable.

---

## 9. Security and privacy

- Argon2id password hashing; short-lived access token; refresh token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Rate limiting on login, registration, password reset, and AI generation.
- Every object access re-checks ownership in the backend, including file downloads and report generation.
- Private object storage only; no public bucket URLs; signed URLs with short expiry.
- Photos stripped of EXIF location unless the user opts to keep it; never included in AI prompts.
- Automated IDOR tests: user A must receive `404` for every one of user B's resources.
- No secrets in the repository; `.env` ignored; `.env.example` documents required keys.

---

## 10. Stack

| Area | Choice | Note |
| --- | --- | --- |
| Frontend | Next.js 16 + TypeScript | already scaffolded |
| Styling | Tailwind CSS + design tokens | add in Step 1 |
| Maps | MapLibre GL JS + OSM tiles | no key required for dev |
| 3D | three.js via React Three Fiber | parametric, not imported models |
| Backend | FastAPI + Pydantic | already scaffolded |
| Auth | FastAPI-native JWT + Argon2id | no external identity provider |
| Database | PostgreSQL 16 + PostGIS | already in compose |
| ORM/migrations | SQLAlchemy 2.x + Alembic | |
| Files | local filesystem in dev, S3-compatible in deploy | MinIO optional |
| PDF | HTML → PDF renderer selected in Step 10 | |
| AI images | Google Gemini (Imagen) behind a provider adapter | key supplied by the team |
| Tests | pytest (backend), Vitest + Playwright (frontend) | |

---

## 11. Step-by-step plan

### Step 0 — Lock the methods, sources, and visual decisions

**Status:** Complete for the implemented methods — decisions, data sources, design rules, user flow, and the methodology document are written. CPWD Table 2 and CGWB Table 5.3 are transcribed with page numbers. Selected single coefficient values remain `pending` by design because CPWD gives ranges, not exact rows; independent engineering review remains open.

**Work**
- [x] ~~Confirm the image provider: Google Gemini.~~
- [x] ~~Confirm the app is not limited to one geography: global open data plus region-keyed rule packs.~~
- [x] ~~Write `docs/DATA_SOURCES.md` with the sources in §6.7, the exact parameter and endpoint used, and the licence or citation.~~
- [x] ~~Write `docs/ENGINEERING_METHODOLOGY.md`: transcribe the CPWD coefficient table and CGWB Table 5.3 with page numbers, and add a worked example for every method.~~
- [x] ~~Fix the feasibility vocabulary and the exact rule-table schema.~~
- [x] ~~Choose the design-event rainfall basis and record it as a configurable parameter.~~
- [x] ~~Record that no engineering advisor is available, so every method ships marked unverified and every result is labelled preliminary.~~

**Deliverables:** methodology doc, data sources doc, approved rule-table schema, demo parameters.
**Exit condition:** the first calculation and the first sizing rule can be implemented without inventing a number.

### Step 1 — Finish the foundation

**Status:** Complete for the SQLite development slice — PostgreSQL/PostGIS is blocked by the unavailable Docker daemon; formatter, Vitest, CI, and backend lockfile are deferred.

**Work**
- [x] ~~Monorepo layout, Next.js app, FastAPI app, docker-compose with PostGIS.~~
- [x] ~~`/health` and `/api/v1` router with OpenAPI docs.~~
- [x] ~~ESLint configuration.~~
- [ ] Add a formatter and enforce it.
- [x] ~~Design-token layer in custom global CSS (`frontend/src/app/globals.css`); Tailwind deliberately not used.~~
- [x] ~~Add pytest.~~
- [ ] Add Vitest and a CI workflow running lint, type-check, and tests.
- [ ] Add backend lockfile.
- [ ] Start PostgreSQL/PostGIS and verify the connection from FastAPI.
- [ ] Add `docker compose` health verification to the README.

**Exit condition:** a clean checkout runs frontend, API, and database, with lint, type-check, and tests green.

### Step 2 — Individual accounts and sessions

**Status:** Complete — individual accounts, Argon2id, JWT access/refresh, revocation, rate limiting, auth UI, and tests. Email verification and email delivery are not implemented.

**Work**
- [x] ~~`users` table and migration.~~
- [x] ~~Register, login, logout, refresh, and password reset.~~
- [ ] Email verification and email delivery.
- [x] ~~Argon2id hashing and JWT access/refresh tokens with `token_version`.~~
- [ ] Refresh token in an httpOnly cookie (tokens are in `localStorage`).
- [x] ~~`get_current_user` dependency and a reusable ownership guard.~~
- [x] ~~Frontend auth pages, session handling, protected routes, and redirect behaviour.~~
- [x] ~~Rate limiting and generic error messages.~~
- [x] ~~Tests: duplicate email, wrong password, invalid/revoked token, reset flow, unauthenticated access.~~

**Exit condition:** a new user can register, log in, refresh, reset, and log out; no protected endpoint is reachable without a valid session. Email verification is deferred.

### Step 3 — User-owned data model

**Status:** Complete — users, properties, assessments, and reset tokens with owner scoping, an Alembic migration, and JSON snapshots. PostGIS, property codes, status transitions, and a seed script are deferred.

**Work**
- [x] ~~SQLAlchemy models and Alembic migrations for users, properties, assessments, and password-reset tokens.~~
- [x] ~~`owner_id` on all user-owned tables with indexes and cascade rules.~~
- [ ] Property code generation (`RW-000123`) independent of the UUID.
- [x] ~~Append-only assessment snapshots (`input_json`, `result_json`, method version).~~
- [ ] Assessment status transitions (draft/reviewed/issued).
- [ ] PostGIS columns for `location` and `footprint`, with a projected-area helper.
- [ ] Seed script with clearly labelled synthetic demo data.

**Exit condition:** two users can each create properties and assessments, and neither can read the other's rows through any repository method.

### Step 4 — Property register and assessment workspace

**Status:** Complete — property register, detail, history, and new-assessment flow. Search/sort/pagination and section navigation are deferred.

**Work**
- [x] ~~Property list with empty/error/loading states.~~
- [ ] Search, sort, and pagination.
- [x] ~~Create property: label, type, address, optional coordinates.~~
- [x] ~~Property detail: summary, map embed, assessment timeline.~~
- [x] ~~"Start new assessment" that never mutates earlier ones.~~
- [ ] Assessment workspace shell with section navigation and progress.

**Exit condition:** a user creates several places, reopens them, and sees a correct, immutable history.

### Step 5 — Survey capture

**Status:** Complete for the MVP fields — roof segments, rainfall, demand, site, geometry, and assumptions. Photo upload, autosave, polygon drawing, water-quality inputs, and a mobile field test are deferred.

**Work**
- [x] ~~Sectioned form with visible units and inline validation; blank site fields are treated as unknown.~~
- [x] ~~Roof segments by area, with the area method recorded.~~
- [ ] Roof segments by drawn polygon.
- [x] ~~Rainfall section: source, period, annual and monthly values.~~
- [x] ~~Soil class, infiltration, groundwater, and site constraints.~~
- [ ] Water-quality inputs.
- [ ] Photo upload with type/size validation and assessment association.
- [ ] Autosave with debounce, resume, unsaved-change guard, and retry on network error.
- [ ] Mobile layout verified on a real phone viewport.

**Exit condition:** a user can enter the calculation-critical fields and get a validated assessment. Autosave and resume are deferred.

### Step 6 — Rooftop yield and storage sizing engine

**Status:** Complete — engine, saved assessment snapshots, API, and tests.

**Work**
- [x] ~~`engineering/rooftop.py`: typed inputs/outputs, per-segment summation, loss chain.~~
- [x] ~~`engineering/storage.py`: monthly balance, tank sweep, reliability curve.~~
- [x] ~~Validation bounds and explicit `INSUFFICIENT_DATA` behaviour.~~
- [x] ~~Persist an assessment with the full input and result snapshots.~~
- [x] ~~API endpoints to run, save, and fetch assessments.~~
- [x] ~~pytest with the reference example and independent hand calculations.~~
- [x] ~~Tests for no negative storage, mass balance, and overflow not exceeding inflow.~~

**Exit condition:** reference examples match independent calculations, and missing inputs produce a clear refusal, not a number.

### Step 7 — Recharge feasibility and structure sizing

**Status:** Complete — engine, saved design options inside the assessment snapshot, API, tests, and region routing. The only pack is India; other regions return `REVIEW_REQUIRED`.

**Work**
- [x] ~~Versioned rule table loaded from data files, with a citation per row.~~
- [x] ~~Evaluator returning per-criterion `pass`/`fail`/`unknown` plus the five-state result.~~
- [x] ~~`engineering/structures.py` with tank, pit, and trench methods; shaft gated.~~
- [x] ~~Design-event parameterisation and percolation checks.~~
- [x] ~~Persist design options inside the assessment result snapshot.~~
- [x] ~~pytest per structure type, including boundary and unknown-input cases.~~
- [x] ~~Guard test: no input combination can yield `ELIGIBLE` when a required criterion is `unknown`.~~

**Exit condition:** every feasibility result is explainable row by row, and no missing value can produce a positive recommendation.

### Step 8 — Maps and location

**Status:** Complete for the MVP — OpenStreetMap embed and optional coordinates. MapLibre, polygon drawing, reverse geocoding, and snapshot export are deferred.

**Work**
- [ ] MapLibre component with OSM and satellite layers.
- [x] ~~Optional coordinate entry; the OpenStreetMap pin is fixed at those coordinates.~~
- [ ] Pin drag.
- [ ] Plot and roof polygon drawing with area display and method label.
- [ ] Reverse geocoding for address prefill.
- [ ] Map snapshot export for the report.
- [x] ~~Coordinates are labelled as optional and not used in calculations.~~

**Exit condition:** a user can record a property location and see it on a map. Drawing a roof and deriving area are deferred.

### Step 9 — Results, drawings, 3D, and AI render

**Status:** Complete for the MVP — results dashboard, parametric 3D viewer, and Gemini concept endpoint. SVG drawings, 3D snapshot storage, a job queue/quota, and a full provenance panel are deferred.

**Work**
- [x] ~~Results dashboard: yield chain, sizing result, feasibility table, warnings, method version.~~
- [ ] SVG drawing generator bound to `design_options.dimensions`.
- [x] ~~React Three Fiber viewer built from the stored design dimensions.~~
- [ ] Layer toggles and design switching.
- [ ] 3D snapshot capture and storage.
- [x] ~~AI adapter and prompt builder; clean disabled path when no key is set.~~
- [ ] PII stripping, job queue, quota, and failure fallback.
- [ ] Provenance panel showing provider, model, seed, and the "illustrative" disclaimer.
- [x] ~~The viewer, report, and tables read the same stored assessment result.~~
- [ ] Consistency test enforced in CI.

**Exit condition:** displayed dimensions match the stored design option exactly. AI images are labelled illustrative but are not stored with the run.

### Step 10 — Versioned reports

**Status:** Partial — the HTML report is print-ready; a server-side PDF renderer and report history are not implemented.

**Work**
- [x] ~~Report template and branding (HTML report page).~~
- [ ] PDF renderer selection and validation.
- [x] ~~Assemble the report from one immutable assessment snapshot.~~
- [ ] Private storage, signed download, and report history.
- [ ] Regeneration creates a new version without altering issued files.
- [x] ~~Include citations, assumptions, warnings, and disclaimers.~~

**Exit condition:** a report reopened later shows the same saved snapshot. A byte-identical server-side PDF is not yet produced.

### Step 11 — Harden, deploy, validate

**Status:** Partial — ownership/validation tests and AI authentication are in place; deployment, accessibility, engineering review, and the runbook remain open.

**Work**
- [x] ~~IDOR and ownership tests across properties and assessments.~~
- [x] ~~Validation and rate-limit verification.~~
- [ ] Upload validation and signed URL expiry (no uploads yet).
- [ ] Accessibility pass and mobile field test.
- [ ] Deployment: HTTPS, secrets, migrations, private storage, backups, restore drill.
- [ ] Engineering review of formulas and sample outputs.
- [ ] User guide and developer runbook.
- [x] ~~Record known limitations honestly (README, `DECISIONS.md`, and the logs).~~

**Exit condition:** the local slice works end to end and access boundaries are proven by tests. Deployment and independent engineering review remain open.

### Implementation status note (2026-10-28)

The status line on each step is the current truth. Completed checkboxes are struck through; open items are plain. What shipped:

- A working Next.js + FastAPI app on SQLite: register, log in, refresh, log out, reset in debug mode, properties, immutable assessment history, results, piping, quantities, and a print-ready report.
- A pure-Python engineering package with monthly water-balance tank sizing, the five-state recharge decision, pit/trench/shaft sizing, piping, and quantities.
- A parametric React Three Fiber viewer with a house, tank, water level, filter, pipework, and a layered recharge-pit cutaway; a Gemini concept endpoint that is disabled cleanly when no key is set.
- Region routing: India (CGWB 2007) is the only recharge pack; other regions return `REVIEW_REQUIRED` while yield and tank sizing still run.
- 55 backend tests and Playwright checks for the full UI flow and the 3D viewer.

Deferred or blocked: PostgreSQL/PostGIS (Docker daemon unavailable), recharge rule packs outside India (other regions return `REVIEW_REQUIRED`), automatic NASA POWER/SoilGrids lookup, email verification and email delivery, MapLibre and polygon drawing, photo upload and autosave, SVG drawings and server-side PDF, 3D snapshot storage, a Gemini job queue/quota, deployment, a formatter/Vitest/CI/backend lockfile, and independent professional review of the selected coefficient values. The CPWD Table 2 and CGWB Table 5.3/§6.2.3.3 pages used by the engine are transcribed in `docs/ENGINEERING_METHODOLOGY.md`. See `docs/DECISIONS.md` and the implementation logs for the reasoning.

### Remaining work at a glance (2026-10-28)

The MVP demo slice is complete: auth, properties, immutable history, yield, tank sizing, the recharge decision, structure sizing, piping, quantities, map, 3D, and a print-ready report. Everything below is an enhancement or hardening item, not a blocker for the demo.

**1. Engineering evidence and review**
- CPWD Table 2 ranges and CGWB Table 5.3/§6.2.3.3 are transcribed with page numbers. Confirm the selected single coefficient values (concrete, metal, asbestos, other) with a civil/hydrogeology professional; they remain `pending` by design because CPWD gives ranges, not exact rows.
- Keep `docs/ENGINEERING_METHODOLOGY.md` current with a worked example for every new method.
- Have the formulas, thresholds, and sample outputs reviewed by a civil/hydrogeology professional.
- Add water-quality and soil-class criteria to the recharge decision.

**2. Data automation**
- Fetch monthly rainfall from NASA POWER from the property coordinates, with a source/period note and a manual override.
- Fetch soil texture from SoilGrids.
- Add recharge rule packs for regions outside India (today every non-India region returns `REVIEW_REQUIRED`).

**3. Product and UX**
- MapLibre with OSM/satellite layers, draggable pin, plot/roof polygon drawing, reverse geocoding, and map snapshot export.
- Photo upload, water-quality inputs, autosave/resume with an unsaved-change guard, and a real-phone mobile check.
- Property search/sort/pagination and an assessment workspace with section navigation/progress.
- Property codes (`RW-000123`), assessment status transitions (draft/reviewed/issued), and a labelled synthetic seed script.

**4. Reports and visuals**
- SVG drawings bound to the stored dimensions; layer toggles and design switching in the 3D viewer; 3D snapshot storage.
- Server-side PDF renderer, private report storage with signed downloads, report history, and versioned regeneration.
- Gemini: PII stripping, job queue, per-user quota, provenance panel, and a live test with a real `GEMINI_API_KEY`.
- A CI consistency test that the viewer, report, and AI prompt all read the same stored assessment.

**5. Platform and operations**
- Start PostgreSQL/PostGIS, run `alembic upgrade head`, and run the full suite against it; add docker-compose health checks and volumes.
- Add PostGIS `location`/`footprint` columns and a projected-area helper.
- Add a formatter, Vitest, a CI workflow (lint + type-check + tests), and a backend lockfile.
- Email verification and delivery; move the refresh token from `localStorage` to an httpOnly cookie.
- Upload validation and signed URL expiry when photo upload lands.
- Accessibility pass, mobile field test, deployment (HTTPS, secrets, migrations, private storage, backups, restore drill), and a user guide/developer runbook.
- Initialise git and commit the working MVP.

Blocked right now: Docker is unavailable, so PostgreSQL/PostGIS has never been started; no Gemini key has been supplied, so only the disabled path is tested.

---

## 12. MVP demo slice

**As built:** the current MVP covers steps 1–7 and the 3D model; the 2D drawing and server-side PDF are deferred, and the AI concept requires a key. The list below is the original planning slice.

If time is short, this is the smallest version that still demonstrates all five pillars:

1. Register and log in.
2. Create one property with a map pin.
3. Enter one or two roof segments and a rainfall value.
4. Get rooftop yield and a tank size.
5. Enter soil infiltration and water-table depth.
6. Get a recharge result of `ELIGIBLE`, `NOT_ELIGIBLE`, or `INSUFFICIENT_DATA` with reasons.
7. See the 2D drawing and the 3D model.
8. Generate one AI concept render.
9. Download the PDF.

Everything else — monthly rainfall series, multiple designs, report history, polygon drawing — can follow.

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Recharge rules become invented thresholds | Rule tables are data with citations; unverified rules keep recommendations gated |
| AI render looks like a construction drawing | Fixed label, disclaimer in UI and PDF, dimensions only from the drawing |
| AI cost runs away | Per-user quota, hard cap, cached results, 3D fallback |
| Storage sizing looks precise but is not | Reliability curve and overflow shown, never a single "correct" tank |
| Map area mistaken for measured area | Area method stored and displayed; measured dimensions override |
| Individual accounts leak data | `owner_id` filter in every query, `404` on foreign IDs, IDOR test suite |
| Scope creep back toward companies/roles | Out-of-scope list in §3 is binding for the MVP |
| Historical results mutate | Append-only runs and reports; regeneration creates a new version |
| Field connectivity | Autosave, retry, and mobile-first layout |

---

## 14. Open decisions

| Topic | Question | Needed by |
| --- | --- | --- |
| Rainfall cross-check | NASA POWER is the default global source. Is a local station cross-check required for India? | Step 0 |
| Coefficient table | Transcribe CPWD Table 2 and the IS 15797 range into the rule file? | Step 0 |
| Recharge rule pack | Confirm CGWB 2007 Table 5.3 as the India pack, with other regions returning `REVIEW_REQUIRED`? | Step 0 |
| Infiltration input | Require a measured test, or allow a texture-based estimate labelled as an estimate? | Step 0 |
| Design event | Which return period and duration for structure sizing? | Step 0 |
| Map tiles | OSM only, or a paid satellite provider? | Step 8 |
| PDF renderer | WeasyPrint or headless Chromium? | Step 10 |
| Deployment | Where will the demo run? | Step 11 |

---

## 15. Working rules

- Calculations are deterministic, documented, versioned, and free of HTTP/DB imports.
- Units, sources, and method versions travel with every value.
- Unknown stays unknown; it never becomes a pass, a zero, or a default.
- Geometry comes from calculations; images never define dimensions.
- Historical runs, issued reports, and uploaded evidence are never overwritten.
- Authorization is enforced on the backend at object level, with tests.
- Build one vertical slice end to end before widening any single pillar.
- Synthetic demo data is labelled as synthetic.
- No claim of professional approval anywhere in the product.
