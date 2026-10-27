# Step 6 — Rooftop yield and storage sizing engine

**Date:** 2026-10-27
**Status:** Complete — engine, persistence, API, and tests

## Goal

Turn a validated roof/rainfall/demand snapshot into a transparent runoff result and a defensible tank size, with no invented numbers and no silent defaults.

## What we implemented

- `backend/app/engineering/` as a pure Python package with no FastAPI or SQLAlchemy imports.
- `rooftop.py`: per-segment runoff `V = sum(P × A_i × C_i) / 1000`, first flush, filter loss, and net collectible volume. Monthly and annual paths share the same arithmetic.
- `storage.py`: a catalogue of buildable tank sizes (HDPE, RCC cylinder, RCC rectangular) and a monthly water balance that sweeps the catalogue and returns the smallest tank meeting the reliability target.
- `rules/coefficients.yaml`: roof runoff coefficients with a source and a verification status per row.
- `rules.py`: cached YAML loader producing typed rule objects.
- `units.py`, `serialize.py`, `types.py`: conversions, JSON-safe output, and frozen dataclasses.
- `POST /api/v1/assessments/calculate` and `GET /api/v1/engineering/rules`.
- 55 tests covering the reference example, monotonicity, mass balance, API validation, and missing-data behaviour.

## Why

- Annual yield cannot size a tank. The monsoon delivers most of the rain in four months, so the tank is driven by dry-season carryover. A monthly balance is the only honest way to answer "how big".
- Keeping losses separate means the results view can show the full chain instead of one opaque efficiency factor.
- A pure package can be tested without a database or a web server, which is what makes the numbers verifiable.

## Decisions and limitations

- **Coefficient rows are partly pending.** Tiles = 0.85 is verified from CPWD's worked example. CPWD Table 2 (p. 14) gives ranges: concrete 0.70–0.95 and corrugated metal 0.70–0.90. The selected single values for concrete, metal, asbestos, and other remain `pending` because CPWD does not state those exact values; asbestos and the fallback use IS 15797 clause 5.1 (p. 2) range 0.80–0.95. The engine emits a warning for pending rows. The full source/page register is in `docs/ENGINEERING_METHODOLOGY.md` §3.
- **First flush is modelled as 1 mm per month** when only annual rainfall is available, and as 1 mm per event-month when a monthly series exists. This is a simplification; event-level data would be better.
- **Filter loss is 5%** of the runoff after first flush. Configurable, labelled as a project assumption.
- **The balance runs a two-year warm-up** before scoring, so the result does not depend on the tank starting empty in January.
- **The catalogue is capped at 50 m³ gross.** Above that the design rules call for multi-cell construction or a rethink. The engine reports the largest practical tank and its actual reliability rather than pretending the target was met.
- **Runs are persisted as snapshots.** Saving an assessment stores the full input and result JSON, so a later rule change never rewrites history. The preview endpoint remains available.
- **Tank selection does not yet filter by available plot space.** It uses the full catalogue.

## Verification

- `pytest`: 55 passed.
- Reference example: 200 m² tiled roof, 900 mm rainfall, C = 0.85.
  - Gross rainfall 180.0 m³, runoff 153.0 m³, first flush 2.04 m³, filter loss 7.55 m³, net 143.4 m³.
  - Hand check: `900 × 200 × 0.85 / 1000 = 153.0`.
- Storage reliability is monotonic in capacity and never exceeds 100%.
- Overflow never exceeds total inflow; unmet demand never exceeds total demand.
- API returns 422 for zero area and for an 11-value monthly series.

## Follow-up

- Confirm the selected concrete, metal, asbestos, and fallback coefficient values with a qualified reviewer. Do not flip them to `verified` without that review; the ranges are transcribed, but the single values are RainWise selections.
- Filter the tank catalogue by available space.
