# Step 9 — Results, 3D, and AI concept

**Date:** 2026-10-27
**Status:** Complete for the MVP

## Goal

Turn a saved run into a report a non-engineer can act on: litres, feasibility, exact tank and recharge sizes, piping, quantities, a 3D view, and an optional concept image.

## What we implemented

- Results dashboard at `/assessments/[id]`: recommended system, harvestable litres, storage, demand met, recharge, exact design, inputs, warnings, monthly water balance, the five-state recharge decision with per-criterion sources, piping schedule, quantities, and sources.
- A parametric React Three Fiber viewer built from the stored dimensions:
  - house with a roof slab and parapet;
  - storage tank with a usable-volume label and a water-level line;
  - sand-and-gravel filter box and routed downpipe, header, overflow, and pit pipes;
  - underground recharge pit with an open grate, soil cutaway walls, and sand/gravel/boulder layers;
  - fixed-size labels, a legend, orbit controls, and an "illustrative, not to scale" note.
- `POST /api/v1/ai/concept`: a Gemini image prompt built only from the decided system, tank label, and structure type. It requires a signed-in user and returns a clean "disabled" response when `GEMINI_API_KEY` is unset. No AI output is fed back into a dimension.
- A standing preliminary-results disclaimer in the report and the page footer.
- "Print / save PDF" uses the browser print dialog and print CSS.

## Why

- The 3D model must be deterministic. It reads the same stored dimensions as the tables, so it cannot drift from the report.
- The AI image is explicitly a concept render. The label and disclaimer stop it from being mistaken for a construction drawing.

## Decisions and limitations

- No SVG drawing generator and no server-side PDF. The browser print output is the report artifact.
- No stored 3D snapshot; the viewer renders on demand.
- No Gemini job queue, quota, or cache. The endpoint calls Gemini synchronously when a key is configured.
- No full provenance panel showing provider, model, and seed; the UI shows the illustrative disclaimer instead.
- A drei `Html` label mounted as the first label could create an empty portal. The viewer delays labels by one render (`labelsReady`) so the portal target is stable.
- The 3D scene uses fixed illustrative gaps between house, tank, and pit; the dimensions in the labels and tables are authoritative.

## Verification

- `frontend/scripts/ui-check.js`: `PASS Storage + recharge`, `PASS 1,43,412 L`, `PASS RCC rectangular 6 x 3 x 2.5 m`, `PASS Recharge decision`, `PASS Piping schedule`, `PASS Quantities`, `PASS 3D layout`; canvas `639×518`; zero console errors.
- `frontend/scripts/viewer-check.js`: both labels present (`Storage tank 39.6 m³ usable`, `Recharge pit 3.0 × 3.0 × 2.5 m`); screenshots reviewed at `C:\Users\devni\AppData\Local\Temp\opencode\rainwise-viewer.png`.
- AI disabled path returns `configured: false` with a message; the endpoint returns `401` without a token (covered by `tests/test_validation.py`).
