# Step 2 — Individual accounts and sessions

**Date:** 2026-10-27
**Status:** Complete (MVP)

## Goal

Give each person a private account so their properties and assessment history survive across sessions, without introducing companies, roles, or sharing.

## What we implemented

- `users` and `password_reset_tokens` tables with an Alembic migration.
- Argon2id password hashing and JWT access/refresh tokens carrying `token_version`.
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, and `GET /auth/me`.
- Logout and password reset increment `token_version`, revoking every token issued before the change.
- A bearer-token dependency and a reusable property-ownership guard that returns `404` for foreign IDs.
- In-process sliding-window rate limits on register, login, and password reset.
- Frontend login, register, forgot-password, reset-password, protected routes, token refresh, and sign-out.
- Tests for duplicate email, weak password, invalid email, wrong password, token revocation, refresh, reset, unauthenticated access, and cross-account reads.

## Why

- A self-contained email/password account avoids an external identity provider and keeps the project runnable without third-party setup.
- Argon2id is the current password-hashing recommendation; storing only a SHA-256 hash of reset tokens means a database leak does not expose usable reset links.
- `token_version` makes logout and password reset effective immediately without a server-side session table.

## Decisions and limitations

- No email verification and no email delivery. Password reset returns the token only when `DEBUG=true` and the environment is not production.
- Tokens are kept in `localStorage`, not an httpOnly refresh cookie. This is simpler for the local demo but is not the hardened production pattern.
- Rate limiting is per-process memory; it must move to Redis before running more than one API instance.
- Email validation uses a regex because `email-validator` could not be installed in this environment.

## Verification

- `backend/.venv/Scripts/python.exe -m pytest -q` → **55 passed**.
- Playwright `frontend/scripts/ui-check.js` registers a fresh user, creates a property, runs an assessment, and opens the report with zero console errors.
- Manual API check: register `201`, property `201`, assessment `201`, fetch `200`, history `1`, AI concept `200` with `configured: false`.
