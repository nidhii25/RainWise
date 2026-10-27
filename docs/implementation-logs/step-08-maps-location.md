# Step 8 — Maps and location

**Date:** 2026-10-27
**Status:** Complete for the MVP

## Goal

Let a user place a property on a map so the report has a visible location and the coordinates are stored with the property.

## What we implemented

- A `SiteMap` component that embeds OpenStreetMap in an iframe with a marker at the property's latitude and longitude.
- Optional latitude/longitude fields on the property form; both are validated to legal ranges.
- The property detail page shows the address, coordinates, and map when coordinates exist.
- Coordinates are stored as floats and are not used in any engineering calculation.

## Why

- The map is context, not evidence. A keyless OSM embed keeps the demo free of API keys and billing.
- Keeping coordinates out of the calculations avoids implying that a map pin is a survey.

## Decisions and limitations

- No MapLibre, satellite layer, draggable pin, polygon drawing, reverse geocoding, or map snapshot export.
- The embed depends on OpenStreetMap's public tile service and network access; it is not a survey-grade base map.
- If coordinates are omitted, the report simply has no map.

## Verification

- The property form accepts and persists coordinates; the backend rejects latitude outside ±90 and longitude outside ±180 with `422`.
- The map component is rendered on the property page; no automated tile-load assertion is made because it depends on the external OSM service.
