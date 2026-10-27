# RainWise

## Product Requirements Document (PRD), Functional Specification, Technical Plan, and Developer Handoff

**Document type:** Product and engineering implementation specification\
**Project:** Rooftop Rainwater Harvesting (RTRWH) and Artificial
Recharge (AR) Potential Assessment System\
**Intended audience:** Software developer(s), project supervisor,
civil/environmental engineering subject-matter expert, QA/test team\
**Status:** Initial implementation baseline --- engineering rules and
local data sources must be verified before production use\
**Suggested working name:** RainWise (name can be changed)\
**Primary operating context:** India, with an initial demonstration
focus on Indore/Madhya Pradesh if suitable local data can be obtained

------------------------------------------------------------------------

# 1. Executive Summary

RainWise is a web-based, authenticated field-survey and engineering
decision-support platform for assessing rooftop rainwater harvesting and
artificial groundwater recharge potential at individual properties.

A company employee or authorized field official visits a home,
apartment, institution, or other building; records the property details,
rooftop measurements, rainfall/site information, soil and groundwater
observations, existing infrastructure, photographs, and constraints;
submits the survey; and runs an engineering assessment. The application
estimates rooftop runoff and potentially collectible water, evaluates
whether artificial recharge is appropriate based on available site
evidence, calculates preliminary sizing for eligible options, compares
candidate designs, and generates a professional report.

All property records and assessments must be retained for future use. An
employee who has evaluated three homes must be able to see those homes
in a property register and reopen their survey, calculations, designs,
photographs, and report later, subject to permissions. A property can
have multiple assessments over time. New assessments must be versioned
rather than overwrite previous results.

The system is not just a rainwater calculator or a static website. It is
a field-survey workflow, property record-management system, engineering
calculation engine, visual design studio, and report-generation platform
in one application.

The visual experience is a major project differentiator. The sizing and
recommendation stage should use an interactive site map, roof outlines
where available, proposed structure locations, pipe/drainage routes
where supported by the data, dimensioned engineering diagrams, structure
cross-sections, comparison cards, charts, and an illustrative
building/system visualization. Drawings that communicate dimensions must
be driven by actual calculated values and must not be merely decorative
AI-generated images.

The software provides preliminary decision support. It must not claim
that a site is safe or suitable for recharge when critical
hydrogeological or water-quality information is absent. It must clearly
distinguish user-entered data, measured data, officially sourced data,
assumptions, estimates, and professionally verified findings. Final
engineering designs must be reviewed by an appropriately qualified
professional and comply with applicable local requirements and
authoritative guidance.

------------------------------------------------------------------------

# 2. Product Vision and Goals

## 2.1 Vision

Enable authorized field personnel to conduct consistent, traceable,
location-aware rooftop rainwater harvesting and artificial recharge
assessments, retain the evidence and calculations, and communicate
possible engineering solutions through understandable visualizations and
professional reports.

## 2.2 Primary goals

1.  Authenticate employees and enforce company- and role-based access.
2.  Maintain a durable register of properties that have been surveyed.
3.  Allow an employee to start, save, resume, submit, and revisit site
    surveys.
4.  Capture all required measurements, observations, location details,
    and evidence in a structured manner.
5.  Calculate rooftop runoff potential using transparent, testable
    formulas.
6.  Evaluate artificial recharge feasibility from relevant soil,
    groundwater, geology, infiltration, water-quality, terrain, and
    site-constraint data.
7.  Calculate preliminary sizes for supported storage/recharge options
    using explicit, reviewed engineering rules.
8.  Present alternatives and explain why each is or is not eligible.
9.  Provide beautiful, useful, technically meaningful maps and design
    visualizations.
10. Generate downloadable, versioned PDF assessment reports.
11. Preserve history, data provenance, assumptions, calculation
    versions, and important user actions.
12. Support quality assurance, independent calculation checks, and
    validation against real or documented sites.

## 2.3 Non-goals for the first release

-   Automatically certifying or approving a final construction design.
-   Replacing a hydrogeologist, civil engineer, field infiltration test,
    water-quality test, or other required site investigation.
-   Making definitive subsurface claims from satellite imagery.
-   Requiring AI for calculations.
-   Allowing a language model to invent dimensions, geological
    conditions, or suitability results.
-   Providing complete offline operation before offline data
    synchronization is designed and tested.
-   Automatically estimating roof dimensions from images in the first
    MVP.
-   Claiming city-wide groundwater suitability without verified and
    appropriately resolved datasets.
-   Guaranteeing cost estimates as contractor quotations.
-   Exposing one company's records to another company.

------------------------------------------------------------------------

# 3. Users, Roles, and Permissions

The initial product should support a multi-company architecture, even if
the first demonstration is deployed for one company. Every record must
be associated with an organization and must be protected on the backend.

## 3.1 Roles

### A. Super Admin

Intended for a platform/company-level administrator with authorized
access.

Possible permissions: - Create/manage company organizations and their
settings. - Create or invite company administrators, where this
responsibility is assigned to the platform. - Manage system-wide
configuration and reference datasets. - View operational/audit
information permitted by policy. - Configure role and permission
policies. - Disable accounts or revoke access when authorized.

The exact meaning of "Super Admin" must be decided: it may mean a
platform operator across organizations or a top-level administrator
inside one company. If the platform serves multiple independent
companies, cross-company access must be tightly restricted, explicitly
authorized, logged, and tested.

### B. Company Admin / Engineer-in-Charge

Permissions within their own company: - Manage company users,
invitations, role assignments, and access. - View authorized company
properties and assessments. - Assign surveys to field employees, if
assignment workflow is enabled. - Review submitted assessments. -
Approve, reject, or return assessments for correction. - View report
history and audit events. - Manage company-specific cost-rate
assumptions and settings, subject to permissions. - Export reports and
records where authorized.

"Approve" in the software means workflow review, not a substitute for
legally required professional certification or engineering sign-off.

### C. Field Employee

Permissions within their company: - View their assigned properties
and/or properties they are otherwise authorized to access. - Register a
new property if permitted. - Create an assessment for a property. -
Enter survey details, measurements, observations, and photos. - Save a
draft and resume it. - Run a preliminary calculation when required
inputs are present. - View results, candidate design options, and
reports they are allowed to access. - Submit an assessment for review. -
View their assessment history.

Whether field employees can see all company properties or only their
own/assigned properties is a configurable policy decision. The default
recommended behavior is: employees can see properties they created or
were assigned, while admins can see company-wide records.

## 3.2 Authorization requirements

-   Authentication must be required for all protected application pages
    and API routes.
-   Authorization must be enforced on the server/API for every read,
    create, update, delete, report download, and workflow action.
-   Do not rely on frontend hiding or disabled buttons as a security
    control.
-   Every organization-owned record must have a `company_id` or be
    linked through an entity that has one.
-   Validate that the authenticated user has access to the company,
    property, assessment, file, and report being requested.
-   Do not trust a `company_id`, `user_id`, role, or property ID
    supplied by the browser without checking it against the
    authenticated identity and database.
-   Prevent insecure direct object reference (IDOR) attacks, including
    attempts to guess another property's UUID/ID.
-   Apply least privilege and deny access by default.
-   Log significant access and workflow changes without logging
    passwords, tokens, or unnecessary sensitive data.
-   When an employee leaves the organization, disable access and retain
    historical records according to company retention policy.
-   Define whether property ownership is by the company record,
    client/customer, or a separate property owner. Do not confuse the
    person who owns the house with the employee who conducted the
    survey.

------------------------------------------------------------------------

# 4. Core User Journeys

## 4.1 Login and dashboard

1.  User opens the application.
2.  User logs in through the configured authentication method.
3.  Backend validates credentials/session and returns the authorized
    profile.
4.  Dashboard displays permitted summary counts and recent work.
5.  User can navigate to properties, new survey, pending work, reports,
    and profile/settings according to role.

Dashboard information may include: - Total properties accessible to the
user. - Total assessments completed. - Draft/in-progress surveys. -
Submitted assessments awaiting review. - Assessments returned for
correction. - Recently updated properties. - Recent reports. - Search
and filters for property ID, address/locality, date, status, and
assigned employee. - Optional map/list toggle.

Counts must be derived from authorized records, not global data.

## 4.2 Create a property and survey

1.  Employee selects "New Property" or "Start Survey."
2.  System searches for an existing property by property ID and other
    suitable fields to reduce accidental duplicates.
3.  If the property is new, the system creates a stable property record
    and unique identifier (example: `RW-IND-0001`; a database UUID
    should remain the actual primary key).
4.  Employee enters property identity, address/locality, location
    coordinates, and basic building information.
5.  Employee creates a new assessment associated with that property.
6.  Employee fills the survey sections.
7.  System validates values, units, required fields, and evidence.
8.  Employee saves a draft at any time.
9.  Employee may calculate a preliminary result when the required data
    are available.
10. Employee submits the assessment when ready.

A survey should not require all advanced hydrogeological values to be
present merely to save a draft. The calculation engine may, however,
refuse a specific recommendation or return "insufficient data" if
critical values are missing.

## 4.3 Revisit an existing property

1.  Employee opens the property register.
2.  Searches by property ID, address, locality, date, or other permitted
    filter.
3.  Opens the property details.
4.  Sees the property summary and assessment timeline.
5.  Opens a historical assessment in read-only mode, including its
    inputs, calculation version, designs, report, and review history.
6.  Starts a new assessment if a new site visit is needed.
7.  The new assessment links to the same property but does not overwrite
    prior assessment values or reports.

## 4.4 Review and approval

1.  Employee submits an assessment.
2.  Assessment status changes to `SUBMITTED`.
3.  Authorized reviewer sees it in a review queue.
4.  Reviewer opens inputs, data-quality warnings, calculations, design
    options, and report preview.
5.  Reviewer approves it or returns it with comments.
6.  If returned, status changes to `RETURNED_FOR_CORRECTION`; employee
    edits the permitted assessment fields and resubmits.
7.  Every status change records actor, time, previous status, new
    status, and optional reason.
8.  Approval is a workflow status only unless the organization has
    defined a separate professional sign-off process.

## 4.5 Report generation

1.  User chooses a specific assessment version.
2.  System verifies access and whether the report can be generated for
    that status.
3.  Backend assembles property details, survey values, data provenance,
    calculation results, design alternatives, caveats, and review
    information.
4.  PDF is generated and stored in private storage.
5.  A report record saves version, file key, generation timestamp,
    creator, and the assessment/calculation version used.
6.  User can download or view the report only if authorized.
7.  Regenerating a report should create a new report version or clearly
    preserve the old artifact; it must not silently replace a report
    previously issued.

------------------------------------------------------------------------

# 5. Main Application Modules and Screens

## 5.1 Authentication and account management

Screens: - Login. - Password reset/invitation acceptance, depending on
chosen auth provider. - Current user profile. - Admin user/role
management. - Optional company setup page.

Requirements: - Secure password/session handling by a trusted auth
library or provider. - Use HTTPS in deployment. - Protect against brute
force and credential stuffing with appropriate rate limiting and
provider controls. - Never store plaintext passwords. - Use secure,
HttpOnly, SameSite cookies for session tokens when using cookie-based
sessions; carefully configure CSRF protection as applicable. - If bearer
tokens are used, store and transmit them safely and define
expiration/refresh/revocation behavior. - Ensure logout invalidates the
relevant session. - Provide account disable/revoke behavior. - Document
how the first administrator account is created safely.

## 5.2 Employee dashboard

Components: - Sidebar/navigation. - Summary cards. - Recent
properties/assessments. - Pending review/work queue. - Search bar. -
Filter controls. - Table/list of properties. - Optional map view. -
Primary action: "Start New Survey." - Status labels that are accessible
and not color-only.

Suggested statuses: - `DRAFT` - `IN_PROGRESS` - `CALCULATED` -
`SUBMITTED` - `UNDER_REVIEW` - `RETURNED_FOR_CORRECTION` - `APPROVED` -
`ARCHIVED`

Do not mark an assessment `APPROVED` solely because the calculation
endpoint returned a result.

## 5.3 Property register and property details

Property register: - Unique property identifier. - Display name/label. -
Locality/address. - Coordinates, if collected. - Property/building
type. - Latest assessment date. - Latest assessment status. - Created by
/ assigned employee where authorized. - Search, sorting, filters, and
pagination.

Property detail: - Property identity and location. - Summary of the
latest assessment. - Assessment timeline/history. - Previous reports and
download links. - Photographs/evidence by assessment. - Map/site view. -
Notes and important constraints. - "Start New Assessment" action. -
Optional comparison of two assessment versions.

A stable property record represents the site/building. An assessment
record represents one visit or evaluation. Do not put every new site
visit into a single mutable row.

## 5.4 Field survey workflow

The survey should be divided into saveable sections, with progress
indicators and field-level validation. Suggested sections are below.
Required status for each field must be finalized with a
civil/hydrogeology subject-matter expert; do not assume all fields are
mandatory for every assessment.

### Section A --- Visit and property identity

-   Property ID (system-generated).
-   Survey/assessment ID (system-generated).
-   Company/organization (derived from authenticated user/context).
-   Surveying employee (derived from authenticated user).
-   Visit date/time.
-   Property label/name.
-   Property category: residential house, apartment/multi-unit building,
    school/college, office/commercial, industrial, public building,
    other.
-   Address/locality/city/district/state/pincode where appropriate.
-   Client/owner contact fields only if required, with privacy
    justification and access controls.
-   Existing property reference number, if any.
-   New visit versus reassessment.
-   Optional assignment/inspection ticket.

### Section B --- Location and mapping

-   Latitude/longitude or selected map pin.
-   Location accuracy/source where available.
-   Address/coordinates confirmation.
-   Property boundary polygon if measured.
-   Roof polygon(s) if measured/drawn.
-   Map notes and site access constraints.
-   Optional elevation/slope values only if a reliable source/method
    exists.
-   Map layer/source metadata.
-   Allow manual coordinate entry where GPS is unavailable.
-   Record the source of coordinates (GPS, map selection, manual,
    imported).

### Section C --- Roof/catchment characteristics

Support multiple roof segments because a building may have several
surfaces. - Roof segment identifier. - Roof area in square metres. -
Area measurement method: measured, plan/document, map digitization,
image estimate, user estimate, other. - Roof surface/material/type. -
Roof slope, where relevant. - Condition/cleanliness. - Catchment
suitability notes. - Drainage outlet/downpipe count and locations, if
known. - Existing gutter/downpipe condition. - Obstructions or
disconnected roof sections. - Photos and annotations. - Measurement
confidence/source.

### Section D --- Rainfall and runoff data

-   Annual rainfall value and unit.
-   Rainfall period/year or climatological period.
-   Data source and source URL/reference where applicable.
-   Whether value is official, API-derived, user-entered, or assumed.
-   Monthly rainfall values where available.
-   Daily/event rainfall values if available for time-step water-balance
    simulation.
-   Runoff coefficient selected for each roof surface or segment.
-   Source/justification for the runoff coefficient.
-   Additional collection efficiency/loss assumption, if used.
-   First-flush diversion assumption.
-   Conveyance/filter losses if separately modelled.
-   Any missing-data warnings.

Do not use a single annual rainfall value to claim a detailed seasonal
storage performance simulation. Annual yield and event-wise storage
modelling are different levels of analysis.

### Section E --- Existing water system and intended use

-   Existing rainwater harvesting system
    (none/partial/complete/unknown).
-   Existing storage tank type and capacity.
-   Existing filter/first-flush arrangement.
-   Existing pipes, drains, and overflow route.
-   Intended use: non-potable use, landscape/garden, cleaning, other,
    recharge, combined, undecided.
-   Estimated demand/use profile, if storage-demand analysis is
    required.
-   Existing drainage or flooding issue.
-   Available space for tank/structure.
-   Maintenance/access considerations.

### Section F --- Soil, infiltration, groundwater, and geology

-   Soil description/type, if known.
-   Infiltration/percolation test result, with units and test method,
    date, and operator.
-   Whether value is measured, sourced, or estimated.
-   Groundwater depth, units, date/season, and source.
-   Geology/lithology or hydrogeological unit, if known.
-   Presence of impermeable/restrictive layer, if known.
-   Water-table seasonal variation, if known.
-   Existing borewell/well details only if relevant and lawfully
    collected.
-   Nearby contamination risks or hazardous land uses.
-   Distance to septic tank/sewer/contamination source where relevant to
    applicable standards.
-   Site slope/topography.
-   Soil/groundwater data source and reliability.
-   Field notes and photos.
-   "Unknown/not measured" must be an explicit option; it must not
    silently be treated as a safe value.

### Section G --- Water quality and risk

-   Roof/catchment contamination concerns.
-   Potential sources of contamination.
-   Available water-quality test results and laboratory/date/source, if
    any.
-   First-flush and filtration provisions.
-   Water quality suitability status: not tested, requires test,
    reviewed, unsuitable, subject to expert assessment.
-   Relevant risk notes.
-   Do not recommend recharge of potentially contaminated runoff without
    required treatment and qualified review.

### Section H --- Site constraints and feasibility

-   Available installation area and dimensions.
-   Existing utilities/underground services, if known.
-   Building foundation proximity and relevant site safety constraints.
-   Flooding/waterlogging observations.
-   Access for construction and maintenance.
-   Drainage direction/route.
-   Setbacks, easements, permissions, and local restrictions if known.
-   Potential structural conflicts.
-   Any constraints specified by the engineer.
-   Photos and annotated notes.

### Section I --- Existing/observed structures

-   Existing storage tank dimensions/capacity.
-   Existing recharge pit/trench/shaft/well details.
-   Existing pipe and filter configuration.
-   Existing condition and maintenance status.
-   Whether the structure is functioning.
-   Photos and inspection notes.

### Section J --- Survey completeness and submission

-   Missing field summary.
-   Data-quality warnings.
-   Confirmation that measurements are accurate to the best of the
    surveyor's knowledge.
-   Draft save.
-   Calculate preliminary assessment.
-   Submit for review.
-   Optional reviewer notes.

------------------------------------------------------------------------

# 6. Engineering Calculation Engine

The calculation engine should be a separate Python package/module,
independent of the UI and API routing. The engine must be deterministic,
testable, documented, unit-aware, and versioned.

It must return structured results with: - Input values used. - Units. -
Formula/method identifier. - Result and units. - Assumptions. - Source
references for coefficients/rules. - Missing or questionable input
warnings. - Calculation-engine version. - Whether output is preliminary
or requires professional review.

## 6.1 Rooftop runoff/yield

A common preliminary formula is:

`V_m3 = P_mm × A_m2 × C / 1000`

Where: - `V_m3` = estimated runoff volume in cubic metres. - `P_mm` =
rainfall in millimetres over the selected period. - `A_m2` =
catchment/roof area in square metres. - `C` = roof runoff coefficient,
dimensionless and selected from a reviewed reference appropriate to the
surface.

Conversion: - `1 m³ = 1,000 litres`. - `V_litres = V_m3 × 1000`.

For multiple roof segments:

`V_total_m3 = Σ(P_mm × A_i_m2 × C_i / 1000)`

If all segments use the same rainfall period, this can be calculated per
segment and summed. Different rainfall periods or sources must not be
mixed without an explicit method.

Illustrative example: - Roof area = 200 m². - Annual rainfall = 900
mm. - Assumed runoff coefficient = 0.80.

`V = 900 × 200 × 0.80 / 1000 = 144 m³ = 144,000 litres`

This is an illustrative runoff estimate, not a guarantee of collected or
usable water.

## 6.2 Additional collection efficiency and losses

If an additional collection efficiency factor `E` is used:

`V_collected_estimate = V_runoff × E`

This factor must be clearly defined so losses are not counted twice. If
first flush, filter loss, conveyance loss, or overflow are modelled
separately, do not apply another aggregate factor that double-counts
those losses.

The UI must distinguish: - Theoretical rainfall on roof. - Estimated
runoff after roof coefficient. - Estimated water reaching the collection
system. - Water stored/used. - Water overflowing or bypassed. - Water
potentially routed to recharge.

## 6.3 Storage water balance

Annual yield alone does not determine a suitable tank size. If the
system models storage performance, use time-step inflow and demand data
(daily or event-based when available).

General model: - `S_previous` = stored water at the previous time
step. - `I_t` = inflow during the current time step. - `D_t` =
demand/withdrawal during the time step. - `S_max` = tank capacity.

A robust update should account for overflow and avoid negative storage:

1.  `available = S_previous + I_t`
2.  `overflow = max(0, available - S_max)`
3.  `stored_before_use = min(S_max, available)`
4.  `actual_use = min(D_t, stored_before_use)`
5.  `S_t = stored_before_use - actual_use`
6.  `unmet_demand = D_t - actual_use`

If the time-step convention applies demand before inflow, define and
document that order consistently. The model should report overflow,
unmet demand, storage utilization, and time periods when the tank is
empty/full.

## 6.4 Preliminary storage tank dimensions

For a rectangular tank:

`V_m3 = L_m × W_m × H_m`

This is geometric volume. The usable volume may be lower due to
freeboard, dead storage, inlet/outlet arrangements, and construction
requirements. Tank sizing should be informed by rainfall timing,
intended demand, storage performance, site space, and applicable
engineering guidance---not annual yield alone.

## 6.5 Artificial recharge feasibility engine

Implement an explainable, rule-based feasibility engine first. It must
not provide a definitive recommendation based only on roof area or
rainfall.

Potential inputs: - Available runoff/source water. - Soil/infiltration
test. - Groundwater depth. - Geology/hydrogeological information. -
Terrain/slope. - Available area and dimensions. - Existing
infrastructure and drainage. - Water quality and contamination risks. -
Nearby sanitation/contamination sources. - Applicable guidelines, local
restrictions, and professional review. - Data completeness and
confidence.

Possible outputs: - `POTENTIALLY_FEASIBLE` - `CONDITIONALLY_FEASIBLE` -
`NOT_RECOMMENDED` - `INSUFFICIENT_DATA` - `PROFESSIONAL_REVIEW_REQUIRED`

Use exact statuses and definitions approved by the engineering advisor.
Do not conflate a missing value with a failed test.

Every result must explain: - Which criteria were evaluated. - Which
inputs were available or missing. - Which rule/standard was applied. -
Why an option was eligible, conditional, or rejected. - What further
field test or professional review is required.

## 6.6 Candidate structure types

Candidate options may include, subject to verified guidance and site
suitability: - Rooftop collection and storage tank. - Recharge pit. -
Recharge trench. - Recharge shaft. - Recharge well or other locally
appropriate structure. - Combined storage and recharge arrangement.

Do not recommend every structure for every property. The rules must use
the relevant site criteria and the approved engineering method. The
supported list may be limited in the MVP to structures for which the
team has reviewed formulas, selection rules, diagrams, and test cases.

## 6.7 Preliminary sizing for recharge structures

Each structure type must have a separately documented sizing method. The
developer must not invent generic dimensions or use the rectangular tank
formula for every recharge structure.

For each supported structure, the engineering specification must
identify: - Required input parameters. - Applicability conditions. -
Formula and units. - Design capacity/inflow basis. - Infiltration/soil
or hydrogeological considerations. - Safety and water-quality
constraints. - Construction allowances and freeboard where relevant. -
Assumptions and limitations. - Relevant authoritative source and
version/page/section. - Professional approval requirements. - Validation
examples.

The exact formulas and selection thresholds must be signed off by a
civil/hydrogeology subject-matter expert before production
recommendations are enabled.

## 6.8 Cost estimation

Use configurable itemized rates rather than a hard-coded total: -
Excavation. - Earthwork and disposal, where relevant. - Masonry/concrete
or tank materials. - Filter media and filter chamber. - Pipes, fittings,
gutters, and downpipes. - Pumps or accessories if applicable. -
Labour. - Transport/other costs. - Maintenance/periodic replacement
allowances if included.

For every rate, store: - Unit. - Rate. - Currency. - Geographic
applicability. - Source/vendor/reference. - Date last updated. - Whether
it is an estimate or a quote. - Tax/contingency treatment if included.

The report must identify cost estimates as indicative and must not
describe them as binding contractor quotations.

## 6.9 Data quality and uncertainty

The engine should: - Reject impossible values and unsupported units. -
Identify implausible or contradictory inputs. - Preserve the original
submitted value and record corrections when traceability matters. -
Display estimates and measured values distinctly. - Show missing
critical information. - Avoid generating a false-precision result. -
Provide ranges/scenarios only where the method supports them. - Document
coefficient selection and data-source dates. - Record calculation-engine
version. - Return a safe "insufficient data" result rather than
guessing.

------------------------------------------------------------------------

# 7. Visual Design Studio and Map Experience

The design studio is a major differentiator. It should be beautiful but
also technically honest and useful to field staff and reviewers.

## 7.1 General UI direction

-   Modern, professional engineering/GIS dashboard.
-   Clean typography and strong visual hierarchy.
-   Spacious cards and a consistent design system.
-   Responsive layout for desktop, tablet, and mobile browser.
-   Clear measurement units and labels.
-   Accessible contrast, keyboard navigation, and labels; never rely on
    color alone for status.
-   Visuals must load gracefully and provide useful fallbacks if map
    tiles or data layers are unavailable.
-   Prioritize clarity over decorative effects.

## 7.2 Map features

Use Leaflet or another agreed mapping library. Candidate
functionality: - Map pin/coordinate selection. - Property boundary
polygon drawing/editing. - Multiple roof segment polygons. - Area
measurement for drawn roof polygons. - Markers for downpipes, filters,
tanks, recharge structures, drainage routes, and constraints. -
Distance/area measurements. - Layer toggles. - Base map selection where
licensing and service terms permit. - Map legend and scale. - Coordinate
display. - Save geometry against the relevant property/assessment. - Map
screenshot/export for the PDF. - Display data-source attribution. -
Optional comparison between the property location and available verified
rainfall/geology/groundwater layers.

Important limitations: - A satellite image is not a reliable measurement
unless an appropriate measurement method and resolution are used. - A
map layer must not be presented as measured field truth unless it is. -
No groundwater depth or geological feature should be invented based on
the map. - Record data-source date, resolution, and coverage where
relevant. - Ensure map and tile provider licensing/attribution is
respected.

## 7.3 Structure visualization

For each supported design option, show: - Structure name and intended
purpose. - Suitability result and rationale. - Dimensioned plan view
where applicable. - Cross-section with labelled dimensions. -
Inlet/outlet/overflow where relevant. - Filter and first-flush
arrangement where applicable. - Roof-to-structure flow schematic. -
Material/item summary. - Estimated capacity and cost. - Maintenance
notes. - Assumptions, warnings, and required professional review.

Recommended implementation: - Build SVG or data-driven frontend
components for diagrams. - Populate labels and dimensions from
structured calculation results. - Use the same structured design data
for the screen and report. - Version the diagram together with the
assessment/design. - Do not use generative images as authoritative
construction drawings. - Clearly label illustrative/non-construction
diagrams where applicable.

## 7.4 Design alternatives comparison

Compare only options that the feasibility engine has not rejected, while
showing rejected options with an explanation if useful.

Comparison fields: - Option/structure type. - Feasibility/suitability
status. - Estimated capacity. - Preliminary dimensions. - Estimated cost
and cost confidence. - Land/space requirement. - Expected water handling
role (storage, recharge, combined). - Maintenance requirements. - Data
gaps and key risks. - Advantages/limitations. - Further tests/reviews
required.

Do not select a "best" option using cost alone. A recommendation must
respect technical feasibility, water quality, groundwater protection,
available space, local requirements, and engineering review.

## 7.5 Charts and visual summaries

Possible visualizations: - Annual/monthly rainfall. - Estimated runoff
by roof segment. - Water balance: runoff, collected, stored/used,
overflow, and recharge routing. - Storage fullness and unmet demand when
time-step simulation exists. - Cost breakdown by component. -
Alternative comparison. - Assessment completeness and data confidence.

Charts must state units, period, and whether values are measured,
sourced, or estimated.

------------------------------------------------------------------------

# 8. Reports and Exports

The PDF report should be professional enough to share with a company
supervisor or client, while making the preliminary nature of unapproved
recommendations explicit.

## 8.1 Suggested report structure

1.  Cover page: project name, report ID/version, property ID, date.
2.  Executive summary.
3.  Property/site identification and map.
4.  Survey details: surveyor, visit date, assessment status.
5.  Photographs and annotations.
6.  Site/catchment measurements and roof segments.
7.  Rainfall data and source/period.
8.  Runoff and collection calculations, including formulas and units.
9.  Storage/water-balance analysis if supported.
10. Soil, infiltration, groundwater, geology, water-quality, and site
    constraints.
11. Data completeness and quality warnings.
12. Recharge feasibility assessment with rule explanations.
13. Candidate structures and alternatives.
14. Recommended preliminary design, where supported.
15. Dimensioned plan/cross-section/system schematic.
16. Material/item list and indicative cost estimate.
17. Maintenance and operational notes.
18. Risks, assumptions, exclusions, and further tests needed.
19. Professional review/approval status and reviewer comments.
20. Sources and engineering reference list.
21. Calculation-engine version and report-generation timestamp.
22. Disclaimer and limitations.

## 8.2 Report behavior

-   Reports are tied to a specific assessment version.
-   A historical report must remain tied to the exact input and
    calculation version used to create it.
-   Report files should be stored privately.
-   Downloads must be authorized on the server.
-   Use short-lived signed links or an authenticated download endpoint,
    as appropriate.
-   Do not expose public predictable file URLs.
-   Re-generation creates a new report version or preserves a clear
    revision history.
-   Include the company logo/name only where configured and authorized.
-   Use consistent units and readable tables.
-   Display the source and date for external data.
-   Distinguish estimated, measured, and officially sourced values.
-   Do not call an unreviewed preliminary output a certified engineering
    design.

------------------------------------------------------------------------

# 9. Proposed Data Model

Use PostgreSQL. Consider PostGIS for spatial geometry. Use UUIDs as
primary keys internally; human-readable property/assessment numbers can
be unique display identifiers.

The following is a logical model, not final migration SQL. Exact columns
should be refined during implementation.

## 9.1 `companies`

-   `id` UUID primary key.
-   `name`.
-   `slug` or organization code.
-   `status` (active/disabled).
-   `settings_json` for non-sensitive configurable preferences where
    appropriate.
-   `created_at`, `updated_at`.

## 9.2 `users`

-   `id` UUID primary key; map to auth provider identity if external
    auth is used.
-   `company_id` or company membership relationship.
-   `full_name`.
-   `email` (unique within the chosen auth model).
-   `role`.
-   `status`.
-   `created_at`, `updated_at`, `last_login_at`.
-   Never store plaintext passwords.

If users can belong to more than one company, use a
`company_memberships` table instead of a single `company_id` on `users`.
This should be decided before implementation.

## 9.3 `properties`

-   `id` UUID primary key.
-   `property_code` unique human-readable ID (e.g. `RW-IND-0001`).
-   `company_id`.
-   `display_name`.
-   `property_type`.
-   Address fields (as required).
-   `latitude`, `longitude` and/or PostGIS point.
-   Optional property boundary geometry.
-   `created_by_user_id`.
-   `assigned_to_user_id` if assignments are supported.
-   `created_at`, `updated_at`.
-   `archived_at` if archival is supported.

The property identity should contain only stable site information.
Visit-specific measurements belong in assessment records.

## 9.4 `assessments`

-   `id` UUID primary key.
-   `assessment_code` unique human-readable ID.
-   `company_id`.
-   `property_id`.
-   `performed_by_user_id`.
-   `assigned_to_user_id` if different.
-   `visit_date`.
-   `status`.
-   `version_number` or explicit version relation.
-   `parent_assessment_id` if a revision model uses parent/child
    records.
-   `submitted_at`, `reviewed_at`, `approved_at` as applicable.
-   `reviewed_by_user_id`.
-   `review_comments`.
-   `calculation_engine_version`.
-   `methodology_version`.
-   `created_at`, `updated_at`.

Use an explicit, documented versioning model. Do not let an assessment
revision mutate an issued report's historical inputs.

## 9.5 `site_details`

-   `id`.
-   `assessment_id` unique or one-to-one relationship.
-   Site/terrain data.
-   Soil and infiltration observations.
-   Groundwater and geology fields.
-   Water-quality status and risk flags.
-   Existing infrastructure.
-   Available-space and constraint data.
-   Data provenance and notes.
-   Timestamps.

If this becomes too broad, split into related one-to-one/one-to-many
tables (e.g. hydrogeology observations, water quality, existing
structures).

## 9.6 `roof_segments`

-   `id`.
-   `assessment_id`.
-   `segment_name`.
-   `area_m2`.
-   `surface_type`.
-   `slope` and unit/method if captured.
-   `runoff_coefficient`.
-   Measurement method/source/confidence.
-   Optional polygon geometry.
-   Notes and timestamps.

Support multiple roof segments per assessment.

## 9.7 `measurements`

-   `id`.
-   `assessment_id`.
-   `field_key` or measurement type.
-   `numeric_value` or typed value.
-   `unit`.
-   `measurement_method`.
-   `source_type` (measured, user-entered, official, API, assumed,
    derived).
-   `source_reference`.
-   `measured_at`.
-   `recorded_by_user_id`.
-   `confidence/quality note`.
-   `created_at`.

Avoid putting every possible field into a generic table if it makes
validation and querying difficult. Use typed domain tables for core
fields and the measurements table for repeatable/variable observations.

## 9.8 `photos` / `attachments`

-   `id`.
-   `company_id`.
-   `property_id`.
-   `assessment_id`.
-   `uploaded_by_user_id`.
-   Private storage object key.
-   Original filename (sanitized).
-   MIME type and file size.
-   Capture/upload timestamp.
-   Optional caption, category, coordinates, and annotation metadata.
-   Optional content hash for integrity/deduplication.

Do not expose storage bucket keys as public URLs. Validate file types
and size, and protect against malicious uploads.

## 9.9 `design_options`

-   `id`.
-   `assessment_id`.
-   Structure type.
-   Feasibility status.
-   Eligibility/rejection reasons.
-   Input snapshot/reference.
-   Calculated dimensions and units (structured JSON only where
    appropriate; consider typed columns for key values).
-   Estimated capacity.
-   Cost breakdown and rate references.
-   Assumptions/warnings.
-   Design/calculation version.
-   Is-selected/preferred flag, if used.
-   Created timestamp.

Store enough information to reproduce and explain the option. Avoid
relying on an unversioned JSON blob alone for every critical engineering
field.

## 9.10 `calculation_runs`

-   `id`.
-   `assessment_id`.
-   Engine version.
-   Methodology/rule-set version.
-   Input snapshot or immutable reference.
-   Output payload and normalized key results.
-   Warnings.
-   Started/completed timestamps.
-   Triggering user.
-   Success/failure status and error category.

A calculation run should be reproducible and auditable.

## 9.11 `reports`

-   `id`.
-   `company_id`.
-   `property_id`.
-   `assessment_id`.
-   `report_code`.
-   `version_number`.
-   Private storage object key.
-   MIME type/file size.
-   Generated by.
-   Generated timestamp.
-   Assessment/calculation version.
-   Report status.
-   Optional checksum.

## 9.12 `review_events` or `audit_events`

-   `id`.
-   `company_id`.
-   `actor_user_id`.
-   Entity type and entity ID.
-   Action/event type.
-   Previous and new status where applicable.
-   Timestamp.
-   Reason/comment.
-   Minimal safe metadata.

Audit records should be append-only to the extent practical. Do not log
secrets or unnecessary personal information.

## 9.13 Optional future tables

-   `company_memberships`.
-   `assignments`.
-   `cost_rate_sets` and `cost_rate_items`.
-   `reference_datasets` / `data_sources`.
-   `engineering_rule_versions`.
-   `notifications`.
-   `report_reviews`.
-   `offline_sync_events` if offline synchronization is implemented.
-   `client/property contacts` if separate contact management is
    justified.

------------------------------------------------------------------------

# 10. API Specification Outline

Use versioned API routing such as `/api/v1`. Final payload schemas
should be defined with Pydantic models and documented through OpenAPI.

Proposed endpoints:

## Authentication/profile

-   `POST /api/v1/auth/login` --- if using application-managed login;
    otherwise use the chosen provider's flow.
-   `POST /api/v1/auth/logout`.
-   `POST /api/v1/auth/refresh` --- only if the selected auth method
    uses refresh tokens.
-   `GET /api/v1/auth/me`.
-   Password reset/invitation endpoints as appropriate.

## Users/company administration

-   `GET /api/v1/company/users`.
-   `POST /api/v1/company/users/invitations`.
-   `PATCH /api/v1/company/users/{user_id}`.
-   `PATCH /api/v1/company/users/{user_id}/status`.
-   Restrict these routes to the correct administrator role and company.

## Properties

-   `GET /api/v1/properties` --- pagination, search, filters.
-   `POST /api/v1/properties`.
-   `GET /api/v1/properties/{property_id}`.
-   `PATCH /api/v1/properties/{property_id}` --- stable property
    metadata only.
-   `GET /api/v1/properties/{property_id}/assessments`.
-   `POST /api/v1/properties/{property_id}/assessments`.
-   `GET /api/v1/properties/{property_id}/map-data` --- only authorized
    geometry/data.

## Assessments/survey

-   `GET /api/v1/assessments/{assessment_id}`.
-   `PATCH /api/v1/assessments/{assessment_id}` --- permitted draft
    fields.
-   `POST /api/v1/assessments/{assessment_id}/submit`.
-   `POST /api/v1/assessments/{assessment_id}/return-for-correction` ---
    reviewer only.
-   `POST /api/v1/assessments/{assessment_id}/approve` --- reviewer
    only.
-   `GET /api/v1/assessments/{assessment_id}/history`.
-   `POST /api/v1/assessments/{assessment_id}/photos`.
-   `DELETE /api/v1/assessments/{assessment_id}/photos/{photo_id}` ---
    if deletion is allowed; audit it.

## Calculation/design

-   `POST /api/v1/assessments/{assessment_id}/calculate`.
-   `GET /api/v1/assessments/{assessment_id}/calculation-runs`.
-   `GET /api/v1/assessments/{assessment_id}/results`.
-   `POST /api/v1/assessments/{assessment_id}/design-options`.
-   `GET /api/v1/assessments/{assessment_id}/design-options`.
-   `GET /api/v1/design-options/{design_id}`.
-   `PATCH /api/v1/design-options/{design_id}/selection` --- if the
    workflow allows selecting a preferred option.

## Reports

-   `POST /api/v1/assessments/{assessment_id}/reports`.
-   `GET /api/v1/assessments/{assessment_id}/reports`.
-   `GET /api/v1/reports/{report_id}`.
-   `GET /api/v1/reports/{report_id}/download` --- authenticated and
    authorized.

## Dashboard/review

-   `GET /api/v1/dashboard/summary`.
-   `GET /api/v1/reviews/queue` --- authorized reviewer only.
-   `GET /api/v1/audit-events` --- authorized administrative access
    only.

Requirements for all endpoints: - Validate authentication and
authorization. - Validate company/property/assessment relationships. -
Validate request types, units, ranges, and allowed state transitions. -
Use pagination for lists. - Return consistent error responses. - Avoid
exposing stack traces or sensitive internal details. - Add rate limits
where appropriate. - Write tests for cross-company access attempts. -
Use transactions for operations that create related records or change
status. - Use idempotency or duplicate protection where repeated
submissions could create duplicate properties, reports, or workflow
events.

------------------------------------------------------------------------

# 11. Suggested Frontend Routes and Navigation

Possible routes (adapt to the final frontend framework conventions):

-   `/login`
-   `/dashboard`
-   `/properties`
-   `/properties/new`
-   `/properties/[propertyId]`
-   `/properties/[propertyId]/assessments/new`
-   `/assessments/[assessmentId]/survey`
-   `/assessments/[assessmentId]/results`
-   `/assessments/[assessmentId]/design`
-   `/assessments/[assessmentId]/reports`
-   `/reviews`
-   `/users` (admin only)
-   `/settings`
-   `/profile`

Recommended primary navigation: - Dashboard - Properties - New Site
Survey - Assessments/Reports - Review Queue (reviewer/admin only) -
Team/Users (admin only) - Settings/Profile

The UI should show actions according to permissions but still rely on
backend authorization.

------------------------------------------------------------------------

# 12. Technology Stack Recommendation

This is a suggested stack, not a mandatory choice. The developer should
confirm versions and hosting constraints before implementation.

## Frontend

-   Next.js.
-   React.
-   TypeScript.
-   Tailwind CSS.
-   A consistent accessible component library/design system if useful.
-   React Hook Form and a schema validator such as Zod for client-side
    form validation; repeat validation on the backend.
-   Leaflet for interactive maps.
-   Plotly or another charting library for data visualization.
-   Data-driven SVG components for engineering diagrams.

## Backend

-   Python.
-   FastAPI.
-   Pydantic for validation.
-   SQLAlchemy.
-   Alembic for database migrations.
-   PostgreSQL.
-   PostGIS for spatial types/queries where needed.
-   Pytest for unit/integration tests.
-   A PDF library or HTML-to-PDF pipeline selected and tested for
    layout, font, image, and table requirements.

## Authentication

Choose one approach before implementation: 1. Managed auth provider such
as Supabase Auth, with server-side authorization checks; or 2. A
carefully implemented backend authentication system using a
well-maintained library.

Do not build password hashing, token handling, password reset, or
session management from scratch without a strong reason and security
review. The chosen provider does not remove the need for company-level
authorization in the application.

## Storage

-   Private object storage for photographs and PDFs.
-   PostgreSQL for metadata and access relationships.
-   Signed URLs or authenticated download endpoints.
-   Backups and retention policy.

## Deployment/operations

-   HTTPS.
-   Environment-specific configuration.
-   Secrets in environment/secret management, never committed to Git.
-   Database migrations.
-   Structured application logs.
-   Error monitoring.
-   Automated backups and restore tests.
-   CI checks for linting, formatting, types, unit tests, and
    security-sensitive tests.
-   Containerization (e.g. Docker) when useful for reproducible
    deployment.

------------------------------------------------------------------------

# 13. Data Sources and Provenance

The platform should not invent local environmental data. A data-source
register must be maintained.

Potential sources to investigate and validate: - Central Ground Water
Board (CGWB) publications and hydrogeological resources. - National
Water Mission and relevant government rooftop rainwater harvesting
guidance. - Official meteorological rainfall records or a suitable
weather/rainfall API. - State/local government datasets where
available. - Local geological/hydrogeological reports. - Field
infiltration/percolation tests and groundwater observations. - Surveyor
measurements and site photographs. - Published/local cost schedules or
documented vendor/contractor estimates.

Before use, verify: - Data licensing and attribution requirements. -
Geographic coverage and resolution. - Time period and update
frequency. - Unit conventions. - Methodology and limitations. - Whether
the data are suitable for a site-level recommendation.

Each external/assumed value should have provenance fields where
relevant: - Source name. - URL/reference. - Source organization. - Date
retrieved or published. - Coverage period. - Spatial
resolution/location. - Value/unit. - Source type: measured, official
dataset, API, user-entered, derived, assumed. - Transformation/method
applied. - Confidence or quality note.

Initial Indore demonstration: - Select a small number of properties for
which sufficient, credible input data can be collected. - Use verified
data or clearly labelled test/demo data. - Do not present fabricated
values as real site data. - If demonstration values are synthetic, mark
them "sample/demo data" throughout the UI and report.

------------------------------------------------------------------------

# 14. Security, Privacy, and Records Management

## 14.1 Authentication and authorization

-   HTTPS in deployment.
-   Secure sessions/tokens.
-   Password reset/invitation process if applicable.
-   Role-based access control.
-   Company-level data isolation.
-   Server-side object-level authorization on every endpoint.
-   Rate limiting and brute-force protection.
-   Safe logout and account disable/revocation.
-   No secrets in source control or client bundles.

## 14.2 File security

-   Store files in private storage.
-   Validate file size, MIME type, and file extension.
-   Sanitize filenames.
-   Avoid executing uploaded content.
-   Consider malware scanning where appropriate.
-   Limit file access to authorized users.
-   Use expiring signed URLs or authenticated downloads.
-   Avoid predictable public file paths.
-   Define maximum photo/report sizes and upload error behavior.

## 14.3 Privacy

-   Collect personal contact details only when necessary.
-   Explain why personal data is collected and who can see it.
-   Avoid unnecessary personal information in PDFs.
-   Apply retention/deletion rules approved by the company and
    applicable law.
-   Do not include precise home location or contact details in public
    links.
-   Ensure demo datasets do not expose real residents' information.

## 14.4 Auditability

Record significant events such as: - Property
created/updated/archived. - Assessment created, edited, submitted,
returned, approved, or archived. - Calculation run and engine version. -
Design option generated/selected. - Report generated/downloaded where
policy requires. - User/role/access changes. - Failed or suspicious
access attempts where appropriate.

Audit events should include actor, action, target record, timestamp, and
reason/context where appropriate. Avoid logging credentials, tokens, and
unnecessary personal data.

## 14.5 Backup and recovery

-   Automated database backups.
-   Object storage backup/retention strategy.
-   Documented recovery point and recovery time objectives where
    relevant.
-   Periodic restore test.
-   Ensure a database restore does not leave report/file references
    broken.

------------------------------------------------------------------------

# 15. Validation, Testing, and Quality Assurance

## 15.1 Engineering formula tests

-   Test the rainfall/runoff formula against independently calculated
    examples.
-   Verify units and litre/cubic-metre conversions.
-   Test multiple roof segments.
-   Test zero rainfall and zero roof area.
-   Test invalid negative values.
-   Test coefficient bounds according to the approved rule set.
-   Test missing coefficient and missing rainfall.
-   Test loss factors are not double-counted.
-   Test storage balance, overflow, empty tank, and unmet demand.
-   Test each structure's sizing method against reviewed worked
    examples.
-   Test that missing critical hydrogeological inputs produce the
    correct status.
-   Test rule explanations and warnings.

## 15.2 API/backend tests

-   Login and logout behavior.
-   Protected endpoint access.
-   Role/permission checks.
-   Cross-company data isolation.
-   Object-level access to properties, assessments, photographs, and
    reports.
-   Draft save/resume.
-   Valid and invalid state transitions.
-   Duplicate prevention/idempotency.
-   File upload restrictions.
-   Report version history.
-   Database transaction behavior.
-   Pagination/search/filter correctness.

## 15.3 Frontend tests

-   Survey form validation.
-   Save draft and resume.
-   Mobile/tablet layouts.
-   Map loading/fallback behavior.
-   Polygon editing and area calculation.
-   Design diagrams show correct dimensions.
-   Charts show correct units and data periods.
-   Loading, empty, error, and offline/network states.
-   Keyboard navigation and accessible labels.
-   Unauthorized routes/actions are not exposed in the UI.

## 15.4 Report tests

-   Correct property and assessment identifiers.
-   Correct formula inputs and outputs.
-   Correct report/calculation version.
-   Correct source attribution.
-   No truncation of tables, labels, maps, or diagrams.
-   Correct units and rounding.
-   Clear preliminary-design disclaimer.
-   Report remains reproducible after a newer assessment is created.
-   Download authorization and private file storage.

## 15.5 Site validation

-   Validate on a selection of real or documented sites with permission
    and appropriate expertise.
-   Compare application calculations with independent calculations.
-   Have engineering experts review the feasibility rules and candidate
    dimensions.
-   Compare estimates with measured values when available.
-   Record limitations and discrepancies.
-   Do not claim validated accuracy without evidence.

------------------------------------------------------------------------

# 16. Non-Functional Requirements

## Reliability

-   Draft data should not disappear due to ordinary navigation or
    recoverable request failures.
-   Show clear save status and retry options.
-   Use transactions and appropriate error handling.
-   Avoid silently discarding unsaved changes.

## Performance

-   Paginate property lists and reports.
-   Avoid loading all company records into the browser.
-   Optimize images and map layers.
-   Keep calculation functions fast and separate from long-running
    external data requests.
-   If report generation becomes slow, consider background jobs and
    status polling.

## Scalability

-   Use indexed database fields for company, property, assessment,
    status, and date.
-   Use spatial indexes for supported PostGIS queries.
-   Keep engineering logic modular.
-   Store files outside the database where appropriate.
-   Avoid unnecessary microservices for the initial MVP.

## Maintainability

-   Clear frontend/backend folder structure.
-   Type hints and Pydantic schemas.
-   Documented formulas and rules.
-   Database migrations.
-   Automated tests and linting.
-   Environment configuration.
-   Versioned calculation methodologies.
-   API documentation.

## Usability

-   Mobile-friendly forms for site visits.
-   Units always visible.
-   Drafts and incomplete sections clearly marked.
-   Useful validation messages.
-   Searchable historical records.
-   Simple, visual explanation of engineering results.
-   Provide a path to correct data or request review.

## Accessibility

-   Sufficient contrast.
-   Keyboard accessibility.
-   Labels for inputs and buttons.
-   Meaningful status text rather than color-only indicators.
-   Readable report typography and chart labels.

------------------------------------------------------------------------

# 17. Recommended Repository Structure

Example monorepo layout:

``` text
rainwise/
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   ├── PRD.md
│   ├── ENGINEERING_METHODOLOGY.md
│   ├── DATA_SOURCES.md
│   ├── API_SPEC.md
│   ├── SECURITY.md
│   └── TEST_PLAN.md
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── properties/
│   │   │   ├── survey/
│   │   │   ├── maps/
│   │   │   ├── design-studio/
│   │   │   ├── charts/
│   │   │   └── reports/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── schemas/
│   │   └── types/
│   └── tests/
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── v1/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── permissions.py
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── properties.py
│   │   │   ├── assessments.py
│   │   │   ├── reports.py
│   │   │   └── data_sources.py
│   │   ├── engineering/
│   │   │   ├── runoff.py
│   │   │   ├── water_balance.py
│   │   │   ├── recharge_feasibility.py
│   │   │   ├── sizing/
│   │   │   ├── costing.py
│   │   │   └── schemas.py
│   │   └── templates/
│   ├── migrations/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── engineering/
│       └── security/
├── infrastructure/
│   ├── docker/
│   └── deployment/
└── sample_data/
    └── README.md
```

This is a suggested structure, not a requirement to create every
directory immediately. Keep the first implementation simple and add
modules as features are built.

------------------------------------------------------------------------

# 18. Delivery Phases and Milestones

## Phase 0 --- Requirements and engineering sign-off

Deliverables: - Final field survey form and units. - List of supported
structure types. - Reviewed formulas, criteria, and authoritative
references. - Defined statuses and role permissions. - Confirmed
auth/storage/database approach. - Data source inventory. - Sample sites
and expected test outputs.

Exit criteria: - Engineering advisor approves the methodology for the
MVP. - Developer knows which fields are required for each calculation. -
Unsupported/unknown data behavior is defined.

## Phase 1 --- Project foundation and authentication

Deliverables: - Repository and development environment. -
Frontend/backend skeleton. - Database connection and migrations. -
Authentication. - Roles and server-side authorization. - Company data
isolation. - Basic dashboard shell.

Exit criteria: - Users can log in/out. - Unauthorized requests are
rejected. - Cross-company access tests pass.

## Phase 2 --- Property registry and survey records

Deliverables: - Property creation/list/detail/search. - Unique property
codes. - New assessment per site visit. - Survey forms and validation. -
Draft save/resume. - Photo upload to private storage. - Assessment
timeline.

Exit criteria: - An employee can register and survey three homes. - The
employee can return later and open all authorized records. - New
assessments do not overwrite previous assessments.

## Phase 3 --- Engineering calculation engine

Deliverables: - Rooftop runoff/yield calculations. - Multi-roof-segment
support. - Collection losses with clear accounting. - Storage balance if
required data are available. - Recharge feasibility statuses and
explanations. - At least one fully reviewed candidate structure sizing
method, if included in the first release. - Cost estimate framework. -
Unit tests and calculation documentation.

Exit criteria: - Independently checked test cases pass. - Missing
critical inputs produce warnings or "insufficient data." - Engine
version and assumptions are stored.

## Phase 4 --- Results dashboard and visual design studio

Deliverables: - Results summary cards. - Rainfall/runoff/water balance
charts. - Interactive map. - Roof polygons and area calculations, if
included. - Data-driven system schematic. - Structure plan/cross-section
with dimensions. - Alternative comparison. - Visual data-source
attribution and caveats.

Exit criteria: - Visualized dimensions match calculation outputs. -
Unsupported options are not presented as recommendations. - Map failures
do not prevent access to survey data/results.

## Phase 5 --- Reports and review workflow

Deliverables: - PDF report generation. - Private report storage and
authorized download. - Report versioning. - Submit/review/return/approve
workflow. - Audit events. - Property history and report history.

Exit criteria: - Report content matches the selected assessment
version. - Historical reports remain accessible according to
permissions. - Review actions are auditable.

## Phase 6 --- Validation, security, and deployment

Deliverables: - Full test suite. - Security review. - Real/documented
site validation. - Deployment configuration. - Backup/restore
procedure. - User guide and developer documentation. - Demo dataset
labelled as demo if synthetic.

Exit criteria: - Critical permission tests pass. - Formula outputs are
independently verified. - Reports are checked. - Deployment and recovery
procedures are documented.

------------------------------------------------------------------------

# 19. MVP Acceptance Criteria

The first usable MVP is complete when all of the following work end to
end:

1.  A user can securely log in.
2.  The system knows the user's company and role.
3.  The user can register a property and receive a unique property code.
4.  The user can create a site assessment for that property.
5.  The user can enter and validate required site details.
6.  The user can save a draft and resume it later.
7.  The user can attach site photographs securely.
8.  The system calculates a preliminary rooftop runoff estimate using
    documented inputs and formulas.
9.  The system reports missing/invalid data rather than silently
    guessing.
10. The system evaluates recharge feasibility only to the level
    supported by the available inputs and approved rules.
11. The system can display a supported candidate design with clear
    assumptions and dimensions.
12. The visual diagram uses the actual calculated design data.
13. The user can generate a PDF report.
14. The property, assessment, calculation result, design, and report
    remain linked in the database.
15. The employee can see and reopen multiple properties and their
    historical assessments.
16. A new assessment does not overwrite a prior assessment/report.
17. Admin/reviewer permissions are enforced on the backend.
18. Cross-company access is blocked and tested.
19. Reports and photographs are not publicly accessible by default.
20. A reviewer can review and return/approve an assessment if the review
    workflow is included in the MVP.
21. Key engineering formulas have automated tests and independently
    checked examples.
22. The report includes source attribution, assumptions, limitations,
    calculation version, and preliminary-design disclaimers.
23. The application works on a mobile browser for field data entry.
24. Errors, loading states, empty states, and unsaved changes are
    handled clearly.

------------------------------------------------------------------------

# 20. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Incorrect engineering formula or    Require subject-matter review,
  structure dimensions                documented formulas, independent
                                      worked examples, and automated
                                      tests.

  Missing soil/groundwater data       Explicit unknown values; use
                                      "insufficient data" or professional
                                      review; do not infer suitability.

  False precision in rainfall/runoff  Show source period, units,
  estimates                           assumptions, and uncertainty.

  Map mistaken for geological proof   Label spatial data sources and
                                      limitations; never infer subsurface
                                      conditions from satellite imagery.

  Employees see another company's     Enforce organization and
  records                             object-level authorization on every
                                      API request; test IDOR/cross-tenant
                                      access.

  Historical report changes after     Version assessments, calculation
  recalculation                       runs, methodology, designs, and
                                      reports.

  Poor field connectivity             Mobile-friendly design and robust
                                      draft saving first; consider
                                      offline synchronization only after
                                      explicit conflict and security
                                      design.

  Unmaintained cost assumptions       Version cost rates with geographic
                                      applicability, source, and
                                      last-updated date.

  Unsupported AI output               Keep deterministic calculations
                                      authoritative; use AI only for
                                      optional explanation and never as
                                      the source of dimensions.

  File leakage or malicious uploads   Private object storage,
                                      authorization checks, upload
                                      validation, safe filenames, size
                                      limits, and appropriate scanning.

  Scope becomes too large             Build the MVP first; add GIS
                                      layers, automated roof detection,
                                      offline mode, and AI after core
                                      workflow validation.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 21. Engineering References and Source Verification

The developer and engineering advisor should review the current
applicable versions of authoritative sources before encoding
coefficients, feasibility thresholds, or sizing methods.

Starting points to investigate: - Central Ground Water Board (CGWB):
https://cgwb.gov.in/ - National Water Mission / relevant Ministry of Jal
Shakti resources: https://nwm.gov.in/ - National Water Mission knowledge
centre previously referenced:
https://jsactr.mowr.gov.in/Public_Dash/KnowledgeCentre.aspx - CGWB
publication/search entry previously referenced:
https://cgwb.gov.in/cgwbpnm/publication-detail/362

These links are starting points for research, not an assertion that any
particular formula or threshold has already been approved. The team must
locate the applicable manual, edition, page/section, and exact method.
The chosen references should be recorded in
`docs/ENGINEERING_METHODOLOGY.md`, and the report should cite the
relevant source.

Also identify applicable state/local regulations, groundwater protection
requirements, water-quality requirements, building constraints, and
professional approval requirements for the deployment jurisdiction.

------------------------------------------------------------------------

# 22. Decisions to Confirm Before Implementation

The developer and project supervisor should resolve these questions
early:

1.  Is the system for one company initially, or multiple companies from
    the first release?
2.  Is Super Admin a platform-wide role or the top administrator within
    a company?
3.  Can field employees view all company properties, or only properties
    they created/are assigned?
4.  Will authentication use a managed provider (e.g. Supabase Auth) or a
    backend-managed auth flow?
5.  Which property and contact details are genuinely necessary?
6.  Which exact survey fields are mandatory for each type of assessment?
7.  Which rainfall source/API is approved for the target geography?
8.  Which hydrogeological/soil datasets are available and sufficiently
    detailed?
9.  Which recharge structure types will be supported in the MVP?
10. Which engineering formulas, sizing methods, criteria, and source
    versions have been approved by the subject-matter expert?
11. Will the first release calculate storage performance from monthly,
    daily, or event-level rainfall?
12. Is a map polygon drawing/roof area tool required in the MVP or a
    later phase?
13. What report branding, language, units, and sign-off fields are
    needed?
14. What local cost rates and maintenance assumptions will be used?
15. Is a formal review/approval workflow required in the first release?
16. Are offline drafts/synchronization required, or is online field use
    sufficient for the first release?
17. What is the expected number of employees, properties, photographs,
    and annual reports?
18. What hosting, privacy, data retention, and backup requirements
    apply?

Do not block all development while every future feature is decided.
Resolve the items that affect the database, authentication, field
schema, and engineering methodology before committing to those designs.

------------------------------------------------------------------------

# 23. Final Developer Instructions

Build the system in small, testable increments. Keep the engineering
calculation engine independent of frontend presentation. Keep
authentication and authorization centralized and enforced server-side.
Model properties separately from assessments so the same home can be
revisited over time. Version calculation results, design options, and
reports. Treat missing field data as missing---not as a positive result.
Use source-backed, reviewed engineering rules. Build diagrams from
structured calculations. Protect site photographs, personal details, and
reports. Do not claim professional approval where it has not occurred.

**Recommended first milestone:** deliver a working vertical slice in
which an authorized employee logs in, creates a property, fills and
saves a basic survey, runs a tested preliminary rooftop runoff
calculation, views the result, generates a PDF, logs out, logs back in,
and reopens the same property and report. After this end-to-end flow
works reliably, expand the hydrogeological assessment and visual design
studio.

The product's core value is the combination of **field data collection +
secure historical records + transparent engineering calculations +
visual site-specific design + traceable reporting**.
