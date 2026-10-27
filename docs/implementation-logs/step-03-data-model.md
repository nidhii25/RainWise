# Step 3 — User-owned data model

**Date:** 2026-10-27
**Status:** Complete (MVP)

## Goal

Store properties and assessment runs so that history is append-only and every row is scoped to one account.

## What we implemented

- SQLAlchemy models: `User`, `Property`, `Assessment`, and `PasswordResetToken`.
- `owner_id` on `properties` and `assessments`, with indexes and cascade rules.
- `properties.is_archived`; archiving hides a property from the active list without deleting its assessment history.
- `assessments.input_json` and `assessments.result_json` store the complete input and result snapshots, plus the method version and summary columns used by history lists.
- An Alembic initial migration; applied to the local SQLite database (`backend/rainwise.db`).
- SQLite foreign-key enforcement enabled on every connection.

## Why

- Storing full snapshots means a later rule or coefficient change never rewrites an earlier result. Reopening an assessment shows exactly what was calculated.
- Owner scoping at the query level is the simplest reliable boundary for an individual-account product.
- Floats for latitude and longitude keep the model portable between SQLite and PostgreSQL. PostGIS is not required for the MVP.

## Decisions and limitations

- PostgreSQL/PostGIS has not been started because the Docker daemon is unavailable in this session. SQLite is the active development database.
- No property code (`RW-000123`) yet; the UUID is the identifier.
- No assessment status workflow (draft/reviewed/issued); a saved assessment is an immutable run.
- No seed script. Tests use clearly labelled fixtures, and the reference example is synthetic.
- No spatial columns or projected-area helper.

## Verification

- `alembic upgrade head` created `alembic_version`, `assessments`, `password_reset_tokens`, `properties`, and `users`.
- Ownership tests: another account receives `404` for a foreign property and an empty property list.
- History tests: a saved run keeps its input snapshot and result, and a second run does not mutate the first.
