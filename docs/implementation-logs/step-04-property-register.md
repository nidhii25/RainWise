# Step 4 — Property register and assessment workspace

**Date:** 2026-10-27
**Status:** Complete (MVP)

## Goal

Let a signed-in person keep several places, reopen them, and start a new assessment without changing an earlier one.

## What we implemented

- Dashboard with the user's properties and recent assessments.
- Create, view, edit, and archive a property. Archiving preserves the assessment history and blocks new runs on that property.
- Property detail with address, optional coordinates, map embed, and assessment timeline.
- "Start new assessment" and "Run another" flows that always create a new saved run.
- Assessment history at `/assessments` and per property.
- Basic loading, empty, and error states, plus a protected-route wrapper.

## Why

- The history is the product's memory. Creating a new run rather than editing the last one keeps every report reproducible.
- Archiving is a reversible way to retire a place without deleting evidence.

## Decisions and limitations

- No search, sort, or pagination yet; the list is small in the demo.
- No property code (`RW-000123`); the UUID is used.
- No section navigation or progress indicator in the assessment form; it is a single page.
- The map is an OpenStreetMap iframe, not a draggable MapLibre map.

## Verification

- Playwright `frontend/scripts/ui-check.js` registers a user, creates a property, opens it, runs an assessment, and reaches the report with zero console errors.
- Backend tests cover create, patch, archive, foreign-property `404`, and archived-property `409`.
