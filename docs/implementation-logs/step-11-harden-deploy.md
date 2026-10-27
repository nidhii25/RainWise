# Step 11 — Harden, deploy, validate

**Date:** 2026-10-27
**Status:** Partial — access-control and validation tests are in place; deployment and engineering review remain open

## Goal

Prove that one account cannot read another account's records, that invalid input is refused, and that the demo can be run and explained honestly.

## What we implemented

- Ownership checks on every property and assessment query; foreign IDs return `404` rather than leaking existence.
- IDOR tests across properties and assessments, plus archived-property `409` behaviour.
- Validation tests for property names and coordinates, an 11-month rainfall series, and AI authentication.
- AI concept endpoint now requires a signed-in user, so an anonymous caller cannot consume Gemini quota.
- Argon2id password hashing, hashed reset tokens, token-version revocation, and in-process rate limits.
- CORS restricted to the local frontend origins.
- A standing "preliminary, not professionally reviewed" disclaimer in the UI and report.

## Why

- The individual-account model is only credible if the backend, not the UI, enforces the boundary.
- Refusing malformed input at the API edge keeps the engineering package from receiving values it cannot defend.

## Decisions and limitations

- No deployment yet. The app runs locally on SQLite; PostgreSQL/PostGIS has not been started because the Docker daemon is unavailable.
- No HTTPS, secret manager, production migration run, backup/restore drill, or private object storage.
- No accessibility audit or physical-phone field test.
- No independent engineering review of the formulas or sample outputs. The coefficients and recharge rules are transcribed published guidance, partly still marked `pending`.
- No separate user guide or developer runbook beyond the README and docs.
- Rate limiting is per-process memory and is not suitable for multiple API instances.

## Verification

- `backend/.venv/Scripts/python.exe -m pytest -q` → **55 passed**.
- Playwright `ui-check.js` covers register → dashboard → property → assessment → report with zero console errors.
- Manual live API check covers register, property, assessment, detail, history, and the AI disabled path.
