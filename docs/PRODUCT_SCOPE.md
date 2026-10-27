# RainWise product scope

## Audience and access

RainWise is a general web application for individuals. A person signs in to keep and revisit their assessed places. Saved data is private to the account that created it. Anyone may self-register with an email address; there is no invitation or organization-approval step. The product does not include companies, organizations, memberships, roles, reviewer queues, shared workspaces, or an admin console.

## Assessment scope

The MVP covers rooftop rainwater harvesting plus a preliminary artificial recharge assessment for on-site properties. A property can have multiple assessments over time; prior assessments remain available and are never overwritten.

The recharge method is a versioned rule pack transcribed from CGWB 2007 guidance, with project assumptions labelled. It returns one of five states: `ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, `NOT_ELIGIBLE`, `INSUFFICIENT_DATA`, `REVIEW_REQUIRED`. Missing values never become zero, a default, or a pass. Only the India pack is available; other regions return `REVIEW_REQUIRED` while yield and tank sizing still run.

## What the MVP delivers

- Individual accounts, properties, and immutable assessment history.
- Annual and monthly rooftop yield.
- Tank type, shape, exact size, reliability, and overflow.
- Recharge feasibility, criterion by criterion.
- Pit, trench, or shaft sizing, piping, and quantities.
- Optional coordinates and an OpenStreetMap embed.
- A parametric 3D view and an optional Gemini concept image.
- A print-ready report.

## Deferred

Companies/organizations, roles, sharing, reviewer workflows, and an admin console; recharge rule packs outside India; email verification and delivery; automatic NASA POWER/SoilGrids retrieval; MapLibre, polygons, and reverse geocoding; photo upload and autosave; a server-side PDF and report history; 3D snapshot storage; a Gemini job queue/quota; production deployment and independent engineering review.

## On-site survey baseline

The handoff survey remains the long-term field schema. The MVP captures the calculation-critical subset; the full A–J sections are the expansion target:

A. Visit and property identity (generated property/assessment IDs, visit time, property label/type/address, and reassessment context). Company and staff assignment fields from the handoff are adapted to the signed-in account; owner contact details are collected only if justified.
B. Location and mapping (coordinates or pin, location source/accuracy, confirmation, optional property/roof polygons, notes, and map-source metadata).
C. Roof/catchment segments (multiple roof areas, measurement method, material, slope/condition, outlets, obstructions, photos, and confidence/source).
D. Rainfall and runoff provenance (value/period/source, optional monthly or event data, runoff coefficient/loss assumptions, and missing-data warnings).
E. Existing systems and intended use (storage, filters, pipes/overflow, uses, demand if needed, drainage concerns, space, and maintenance).
F. Soil/infiltration/groundwater/geology (test values and methods, measurement/source, dates, water-table context, known geology/constraints, contamination proximity, and explicit unknowns).
G. Water quality and risk (contamination concerns, test provenance, treatment, and review status).
H. Site constraints and feasibility (area/dimensions, utilities, foundation proximity, flooding, access, drainage route, permissions, structural conflicts, photos, and notes).
I. Existing structures (storage/recharge dimensions, pipe/filter configuration, condition/function, photos, and inspection notes).
J. Completeness and submission (missing-field summary, data-quality warnings, surveyor confirmation, draft save, preliminary calculation, and submission actions if later used).

## Standing limits

No engineering advisor reviewed the formulas. Results are preliminary. Every report carries the disclaimer. The survey baseline is broader than the MVP; fields may remain optional or unknown, and each calculation defines its own minimum inputs. No unknown recharge value is treated as safe.
