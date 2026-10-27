# Step 10 — Versioned reports

**Date:** 2026-10-27
**Status:** Partial — print-ready HTML report; no server-side PDF or report history

## Goal

Produce a report that can be handed to a household or a contractor without losing the inputs, assumptions, warnings, or sources.

## What we implemented

- A complete HTML report on the assessment page: recommended system, metrics, exact design, inputs, warnings, monthly chart, recharge criteria and sources, piping, quantities, sources, and the preliminary-results disclaimer.
- Print CSS that hides the app chrome and keeps the report sections together.
- "Print / save PDF" uses the browser print dialog, so the user can save a PDF without a server-side renderer.
- Every report reads the saved assessment snapshot, so reopening an old run shows the original input and result.

## Why

- A browser print is the lowest-risk way to deliver a PDF in this environment. It avoids a WeasyPrint/Chromium dependency and keeps the report layout in the same code as the screen.
- The snapshot is the versioning mechanism: the report is reproducible because its inputs and outputs are stored, not recalculated.

## Decisions and limitations

- No server-side PDF renderer, private report storage, signed download, or report history.
- No explicit report version number or byte-identical regeneration test.
- The browser's print dialog controls page size, headers, and footers; the app does not control those.
- The 3D canvas may not print on every browser; the dimension tables are authoritative.

## Verification

- The report renders the reference run end to end in Playwright with zero console errors.
- The "Print / save PDF" button is present; a PDF file was not generated in the automated check because it opens a browser dialog.
