# Step 5 — Survey capture

**Date:** 2026-10-27
**Status:** Complete for the MVP fields

## Goal

Capture the smallest set of inputs the engineering engine needs, with units visible, invalid values blocked, and unknown values kept as unknown.

## What we implemented

- A single-page assessment form with sections for roof segments, rainfall, demand, site conditions, geometry, and assumptions.
- Roof segments accept an area, material, optional measured runoff coefficient, and area method.
- Rainfall accepts annual depth plus an optional 12-month series; the monthly series drives tank sizing.
- Site inputs cover measured infiltration, water-table depth, contamination distance, free space, slope, and soil class. Any of these may be left blank.
- Geometry inputs cover eave length, building height, tank distance, and recharge distance.
- Assumptions cover first flush, filter loss, reliability target, freeboard, dead storage, pit void ratio, contamination setback, and percolation safety factor.
- Inline validation and backend bounds; a blank site value becomes `INSUFFICIENT_DATA` or `REVIEW_REQUIRED`, never zero.

## Why

- A blank value is information. Treating it as zero would turn "we did not test the soil" into "the soil does not infiltrate", which is the opposite of safe.
- Keeping the assumptions visible makes the result explainable and lets the user change one input and see the effect.

## Decisions and limitations

- No photo upload or evidence attachment.
- No autosave, resume, or unsaved-change guard; the form is submitted in one go.
- No drawn roof polygon or map-derived area; areas are entered as numbers with a recorded method.
- No mobile field test on a physical phone; the layout has a responsive breakpoint.
- Monthly rainfall must have exactly 12 values when supplied. Without a series, tank sizing returns no recommendation with a `storage_needs_monthly_rainfall` warning; the annual yield is still reported.

## Verification

- Playwright `ui-check.js` completes the form with the reference values and reaches the report.
- Backend tests reject an 11-month series, a zero roof area, and an out-of-range reliability target with `422`.
