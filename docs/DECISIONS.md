# RainWise decisions and open questions

This file records product and engineering decisions made during planning. A decision is not implemented until its related plan tasks and implementation log say so.

## Accepted decisions

| Topic | Decision | Status |
| --- | --- | --- |
| Product availability | Any individual may use the general RainWise web application; no single organization is preselected as the owner. | Agreed |
| Login and history | Users log in to retain and revisit the places and assessments associated with their own account. | Agreed |
| Signup | Anyone can self-register with an email address; no invitation or company approval is required. | Agreed; sign-in method fixed in the 2026-10-27 update below |
| Record visibility | One account cannot read another account's records. Enforce this in the backend. | Agreed; implemented with owner-scoped queries and `404` on foreign IDs |
| Roles and sharing | Company admin/reviewer roles and shared team workspaces are permanently out of scope, not deferred. | Agreed |
| Assessment scope | MVP includes rooftop harvesting and preliminary artificial recharge assessment. | Agreed |
| Survey coverage | Use all ten survey sections (A-J) from the handoff as the MVP field-schema baseline, adapted for account-owned records. | Agreed; the MVP form captures the calculation-critical fields. Photo upload, autosave, and polygon drawing are deferred |
| Recharge claims | No invented criteria or suitability recommendations. Research/validate a method; until approved, report pending/insufficient data. | Agreed; the India rule pack is implemented from CGWB 2007 and every result is labelled preliminary |

## Decision update - 2026-10-27: individual-account product direction

This update supersedes the organization/membership model implied by the original developer handoff. The active plan is now `docs/IMPLEMENTATION_PLAN.md`.

| Topic | Decision | Status |
| --- | --- | --- |
| Tenancy | Individual accounts only. No organizations, memberships, roles, sharing, reviewer queues, or admin console. | Agreed |
| Record ownership | Every property, assessment, calculation, photo, render, and report is owned by exactly one user account and is invisible to all others. | Agreed |
| Scale of use | One user may register unlimited properties and create multiple assessments per property over time. | Agreed |
| Authentication | Self-contained email + password with Argon2id and JWT, implemented in FastAPI. No external identity provider. | Agreed; implemented (no email verification or delivery) |
| Recharge output | A rule-based feasibility engine with five fixed states: eligible, conditionally eligible, not eligible, insufficient data, review required. Missing values never pass. | Agreed |
| Structure sizing | Each structure type (tank, pit, trench, shaft) has its own documented method, applicability conditions, and worked example. Shaft stays disabled until reviewed. | Agreed; pit/trench/shaft implemented; the shaft is selected only for low infiltration and flagged for professional review |
| Storage sizing | Tank size comes from a monthly water-balance reliability sweep, not from annual yield alone. | Agreed |
| 3D visualisation | Parametric model built from stored calculation dimensions, rendered with React Three Fiber. Deterministic per calculation run. | Agreed |
| AI visuals | AI generates an illustrative concept render only. It never sets or changes a dimension and is always labelled as illustrative and not to scale. | Agreed |
| Maps | MapLibre with a pin, optional plot/roof polygons, and a satellite toggle. Map-derived areas are labelled approximate; measured dimensions take precedence. | MVP uses a keyless OpenStreetMap embed with optional coordinates; MapLibre, polygons, satellite, and map-derived areas are deferred |
| Historical integrity | Calculation runs and issued reports are append-only. Regeneration creates a new version. | Agreed; assessment snapshots are append-only. Issued report versioning is deferred |
| Design output | Every assessment returns a build specification: system type, tank shape and dimensions, recharge structure type and dimensions, piping schedule, quantities, and construction sequence. | Agreed |
| Tank selection | Shape and material are chosen from a fixed catalogue by required volume and available space, not invented per site. | Agreed; the volume sweep is implemented. The available-space filter is deferred |
| Recharge selection | Structure type is chosen by a decision tree using infiltration rate, water-table depth, contamination setback, and available space. | Agreed |
| Piping | Gutters, downpipes, first flush, filter, inlet, and overflow are sized by rule and reported as a schedule with computed lengths. | Agreed |
| Design event | Default 50 mm/h for 1 hour, configurable per region. | Agreed as a project assumption |
| Groundwater clearance | Recharge structures stop at least 3 m above the water table. | Agreed |

| AI provider | Google Gemini (image generation) for concept renders, behind a provider adapter. | Agreed |
| Engineering data | Real open datasets plus user measurements. AI-generated rainfall, coefficients, thresholds, or dimensions never enter a calculation. | Agreed |
| Geography | Not limited to one region. Global open data for rainfall and soil; region-keyed rule packs for recharge criteria; unmatched regions return `REVIEW_REQUIRED`. | Implemented for recharge routing; rainfall and soil are manual inputs, and only India has a pack |
| Engineering review | No civil/hydrogeology advisor is available. Every method ships marked unverified, and every result is labelled preliminary and requiring professional review. | Agreed |
| Synthetic data | Permitted only as clearly labelled test fixtures and demo records, never as real assessment output. | Agreed |

## Open decisions

| Topic | Question | Status |
| --- | --- | --- |
| Survey rules | Which fields in the A-J survey are required/optional, what units/validation apply, and which missing inputs block each calculation? | Open |
| Rainfall cross-check | NASA POWER is the default global source. Is a local station cross-check required for India? | Open |
| Coefficient table | Transcribe CPWD Table 2 and the IS 15797 range into the versioned rule file? | Ranges transcribed with page numbers. Tiles 0.85 is verified from CPWD's worked example; concrete/metal/asbestos/other remain `pending` by design because CPWD gives ranges, not exact single rows. See `docs/ENGINEERING_METHODOLOGY.md` §3. |
| Recharge rule pack | Confirm CGWB 2007 Table 5.3 as the India pack, with other regions returning `REVIEW_REQUIRED`? | India pack implemented; other regions return `REVIEW_REQUIRED` |
| Infiltration input | Require a measured infiltration test, or allow a texture-based estimate that is clearly labelled as an estimate? | Measured infiltration is used; missing values return `INSUFFICIENT_DATA`. Texture-based estimates are deferred |
| Design event | Which return period and duration should drive recharge structure sizing? | Resolved for the MVP: 50 mm/h for 1 hour, stored in the rule file |
| Maps | Are manual coordinates enough initially, or are property/roof polygons needed? | Resolved for the MVP: optional manual coordinates plus an OSM embed |
| Reports | Which report format, language, branding, and review/sign-off fields are needed? | Resolved for the MVP: browser print/PDF; server-side versioning deferred |
| Authentication/operations | Which hosting, file storage, privacy/retention, and backup requirements apply? | Open |
| Map tiles | OSM raster only, or a licensed satellite provider for deployment? | OSM raster only for the MVP |
