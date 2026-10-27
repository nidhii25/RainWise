# Step 7 — Recharge feasibility and structure sizing

**Date:** 2026-10-27
**Status:** Complete — engine, persistence, API, and tests

## Goal

Decide whether artificial recharge is possible at a site, explain the decision criterion by criterion, and size a structure that can actually drain the design storm.

## What we implemented

- `rules/in/cgwb-2007.yaml`: a versioned rule pack with five criteria, a source and locator per criterion, and a `design` block for the design storm and structure thresholds.
- `recharge.py`: evaluates each criterion to `pass`, `fail`, `unknown`, or `review`, then derives one of the five fixed statuses.
- `structures.py`: separate geometry and percolation checks for a pit, a trench, and a shaft; a decision tree that picks the type; a catalogue sweep that picks the smallest adequate size.
- `piping.py`: gutter, downpipe, first flush, filter, tank inlet, overflow, and recharge inlet sized by rule, with lengths derived from geometry.
- `quantities.py`: excavation, RCC, masonry, filter media, geotextile, and pipe totals.
- `design.py`: orchestrates the whole assessment and selects storage-only, storage-and-recharge, recharge-only, or none.
- Region routing: only `in` has a rule pack. Any other region returns `REVIEW_REQUIRED` with a `recharge_rule_pack_missing` warning instead of silently applying India rules; yield and tank sizing still run.

## Why

- The handoff requires an explainable rule engine, not a black box. Every criterion is returned with its value, threshold, result, and source so the UI can show the reasoning.
- A recharge structure is not a tank. Each type has its own volume basis and wetted area; reusing the tank formula would produce wrong dimensions.
- The percolation check is what stops the system recommending a pit that will simply overflow.

## Decisions and limitations

- **No engineering advisor reviewed the rules.** They are transcribed from CGWB guidance and project assumptions, and every result is labelled preliminary.
- **Five criteria only.** Infiltration, water-table depth, contamination setback, available space, and slope. More criteria (water quality, soil class, aquifer type) are future work.
- **Contamination setback of 15 m is a project assumption**, not a CGWB figure. It is configurable.
- **Design storm is 50 mm/h for 1 hour**, a project assumption based on common Indian municipal practice. It is a rule-file value, not a constant in code.
- **The shaft is enabled but flagged.** Any shaft result raises an error-level warning requiring professional review, because it may cross a low-permeability layer.
- **Status precedence:** a hard failure is `NOT_ELIGIBLE`; any unknown required input is `INSUFFICIENT_DATA`; an unknown soft input is `REVIEW_REQUIRED`. Missing data outranks review, because you cannot review what was never measured.
- **`CONDITIONALLY_ELIGIBLE`** is applied when every criterion passes but the selected structure handles less than 100% of the design storm.
- **Design options are stored in the assessment result snapshot**, alongside the criteria and warnings, so the report and the 3D viewer read the same dimensions.

## Verification

- 55 tests pass, including:
  - complete site → `ELIGIBLE`
  - missing infiltration → `INSUFFICIENT_DATA`
  - 2 m water table → `NOT_ELIGIBLE`
  - contamination at 5 m → `NOT_ELIGIBLE`
  - unknown slope → `REVIEW_REQUIRED`
  - unknown region → `REVIEW_REQUIRED`; region path traversal → `422`
  - high permeability → pit; low permeability → shaft
  - structure depth never violates the 3 m water-table clearance
- Reference example: pit 3.0 × 3.0 × 2.5 m, 9.0 m³ working volume, 0.65 m³/h percolation, handles 100% of an 8.5 m³ design storm, 9.5 m clearance above the water table.
- Guard: no combination of inputs can produce `ELIGIBLE` while a required criterion is unknown.

## Follow-up

- Transcribe CGWB Table 5.3 row by row with page numbers and replace the current principle-level rules.
- Add water-quality and soil-class criteria.
- Add a recharge rule pack for regions other than India.
