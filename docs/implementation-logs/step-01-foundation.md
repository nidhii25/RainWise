# Step 1 — Repository and local development foundation

**Date:** 2026-10-26 (Asia/Calcutta)  
**Status:** Complete for the SQLite development slice — PostgreSQL/PostGIS blocked by the unavailable Docker daemon; formatter, Vitest, CI, and backend lockfile deferred

## Goal

Establish the initial monorepo, Next.js + TypeScript frontend, FastAPI backend, PostgreSQL/PostGIS local service, and contributor setup notes. This is scaffolding; no authentication, application database access, or engineering calculation has been implemented.

## What we implemented

- Created the `frontend/`, `backend/`, `infrastructure/`, and `docs/implementation-logs/` areas.
- Added a minimal Next.js App Router UI with a RainWise introduction and responsive styling. It intentionally says the foundation is in progress rather than implying product features exist.
- Added a FastAPI app with `/health`, API metadata/OpenAPI documentation, and local CORS access for the Next.js development server.
- Added backend and frontend setup notes, dependency manifests, `.env.example`, root README, and `.gitignore` rules for local secrets and generated output.
- Added Docker Compose for PostgreSQL 16 with the PostGIS 3.4 image, a local-only development credential, persistent volume, and health check.

## Why

- A monorepo keeps the UI, API, infrastructure, and product decisions together while retaining clear frontend/backend boundaries.
- PostgreSQL is the recommended relational source of truth; using the PostGIS image makes the future location/roof geometry path available without requiring geometry behavior now.
- The health endpoint and OpenAPI page provide simple ways to inspect the API once dependencies are installed.
- The landing page is deliberately a placeholder, so it does not suggest that surveys or calculations already work.
- Local database credentials are explicitly development-only and `.env` is ignored; deployment secrets still need a separate secure configuration.

## Decisions and limitations

- PostGIS is enabled in the local database image, but no spatial columns or geographic methods exist yet.
- Authentication provider, deployment platform, and multi-organization policies remain undecided. No login/session behavior is present.
- Frontend dependencies are installed with `frontend/package-lock.json`; backend dependencies are installed in the ignored local `backend/.venv`. The backend has no committed lockfile yet.
- Docker CLI is installed, but the Docker daemon is unavailable in this session, so the local database has not been started or checked for readiness.
- `npm` must be invoked as `npm.cmd` in this PowerShell environment because the PowerShell `npm.ps1` shim is blocked by execution policy.

## Verification performed

- Confirmed Node.js, Python, Docker, and npm.cmd are present.
- Inspected the workspace; it initially contained only the project handoff and implementation plan, so the scaffold did not replace existing application code.
- No application test suite was run. The production frontend build, lint command, and API health smoke check are recorded below.

## Follow-up

- Start PostgreSQL/PostGIS when Docker Desktop/the daemon is available.
- Choose and configure a formatter.
- Continue with Step 0 decisions before implementing authentication, tenant authorization, the data model, or engineering methods.

## Updated implementation and verification

- Installed frontend packages with `npm.cmd install`; the lockfile resolves Next.js 16.4.3. npm reported zero known vulnerabilities in the installed dependency set at install time.
- Installed the backend package and dependencies into `backend/.venv`; current resolved FastAPI is 0.162.0.
- Added a FastAPI v1 router at `/api/v1`, typed health response, and automatic OpenAPI schema/docs.
- Added ESLint flat configuration for Next.js and TypeScript.
- Ran `npm run build` successfully with Next.js 16.4.3.
- Ran `npm run lint` successfully.
- Started the FastAPI server and fetched `/health`; it returned HTTP 200 with `{"status":"ok","service":"rainwise-api"}`. The server was then stopped.
- Attempted to start PostgreSQL/PostGIS with Docker Compose. This machine has the Docker CLI, but the Docker daemon pipe is unavailable (`//./pipe/docker_engine` not found); the database is not running.
- Fixed UTF-8 BOMs in generated source/config files after Next.js reported JSON/TypeScript config parsing errors during the first build attempt.

## Current Step 1 state

Scaffolding, package installation, frontend production build, frontend lint, and API health smoke check are complete. The full local-stack exit condition remains open because Docker Desktop/the Docker daemon is not available in this session. Formatter choice and setup against a live database also remain open.

## Final state (2026-10-27)

- Frontend production build passes (Next.js 16.4.3) and generates all ten routes; ESLint passes.
- Backend test suite: **55 passed** (`backend/.venv/Scripts/python.exe -m pytest -q`).
- SQLite is the active development database; `alembic upgrade head` created the schema. PostgreSQL/PostGIS has never been started because the Docker daemon pipe is unavailable.
- Deliberate deviations: custom global CSS instead of Tailwind; browser print instead of a server-side PDF; an OpenStreetMap iframe instead of MapLibre.
- Deferred: formatter, Vitest, CI workflow, backend lockfile, `docker compose` health verification, and a live PostgreSQL connection check.
- The API and frontend were verified together with Playwright against installed Chrome; zero console errors on the full register → property → assessment → report flow.
