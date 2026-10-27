# RainWise

RainWise is a login-based web app for a first-pass rooftop rainwater harvesting and artificial recharge assessment. A user registers a place, enters roof and site data, and gets:

- harvestable litres, with a monthly water balance;
- a storage tank type, shape, exact size, reliability, and overflow;
- a five-state recharge decision and a sized pit, trench, or shaft;
- a piping schedule and approximate quantities;
- an OpenStreetMap location, a parametric 3D model, and an optional Gemini concept image;
- a print-ready report.

Accounts are individual only. There are no companies, teams, roles, sharing, reviewer queues, or admin console.

## Current status

The MVP works end to end on SQLite:

- FastAPI backend with Argon2id passwords, JWT access/refresh tokens, token revocation, rate limiting, and owner-scoped properties and assessments.
- Pure-Python engineering engine for rooftop yield, monthly tank sizing, recharge feasibility, structure sizing, piping, and quantities.
- Next.js frontend with auth pages, property register, assessment form, report, monthly chart, and a React Three Fiber viewer.
- 55 backend tests pass. Playwright checks the full register → property → assessment → report flow and the 3D viewer with zero console errors.

PostgreSQL/PostGIS is supported through `DATABASE_URL` but has not been started in this environment because the Docker daemon is unavailable. SQLite is the default.

## Quick start

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e .
Copy-Item .env.example .env
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

The default `.env` uses `sqlite:///./rainwise.db` and `AUTO_CREATE_TABLES=true`, so the tables are created on first start. To manage the schema with Alembic on a fresh database, set `AUTO_CREATE_TABLES=false`, run `.venv\Scripts\alembic upgrade head`, then start the API.

API docs: `http://127.0.0.1:8000/docs`. Health: `/health` and `/api/v1/health`.

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. The API base defaults to `http://localhost:8000/api/v1`; override it with `NEXT_PUBLIC_API_URL`. On PowerShell, use `npm.cmd` because the `npm.ps1` shim may be blocked by execution policy.

### AI concept image (optional)

Set `GEMINI_API_KEY` in `backend/.env` and restart the API. The default model is `gemini-3.1-flash-image`. Without a key, the concept card reports that images are disabled and the parametric 3D view remains available.

## Tests

```powershell
cd backend
.venv\Scripts\python -m pytest -q
```

Frontend production build and lint:

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

Optional Playwright checks (requires installed Chrome and `playwright-core`):

```powershell
cd frontend
node scripts/ui-check.js
node scripts/viewer-check.js
```

## Engineering disclaimer

Results are preliminary. They are calculated from published guidance (CPWD, IS 15797, CGWB 2007) and labelled project assumptions, not from a site inspection by a qualified engineer. Verify infiltration, water-table depth, contamination setbacks, and soil conditions on site, and have the final structural design reviewed by a licensed professional before construction.

## What is deliberately not built

- PostgreSQL/PostGIS in the running demo (the Docker daemon is unavailable).
- Recharge rule packs outside India. Other regions return `REVIEW_REQUIRED`; yield and tank sizing still work.
- Automatic NASA POWER rainfall and SoilGrids texture lookup. Rainfall and soil are entered manually; the documented lookup sources are in [data sources](docs/DATA_SOURCES.md).
- Email verification and email delivery. Password reset returns a token only when `DEBUG=true` and the environment is not production.
- MapLibre, satellite layers, draggable pins, roof polygon drawing, and reverse geocoding.
- Photo upload, autosave/resume, and a physical-phone field test.
- A server-side PDF renderer and versioned report storage. The report uses the browser print dialog.
- Stored 3D snapshots and a Gemini job queue/quota.
- CI, a formatter, Vitest, and a backend lockfile.
- Production deployment, HTTPS/secrets management, backups, and an independent engineering review.

Known operational limits: tokens are kept in `localStorage`, rate limiting is per-process memory, and the AI endpoint requires a signed-in user but has no per-user quota.

## Documentation

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Decisions](docs/DECISIONS.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Design rules](docs/DESIGN_RULES.md)
- [User flow](docs/USER_FLOW.md)
- [Implementation logs](docs/implementation-logs/README.md)
- [Original developer handoff](RainWise_Project_Plan_and_Developer_Handoff.md)
