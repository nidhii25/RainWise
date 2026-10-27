# RainWise end-to-end flow

**Purpose:** Describe, in plain language, what the user does, what the system does, and what comes out. This is the reference the build is checked against.

**One sentence:** A person signs in, puts a place on a map, enters roof and soil numbers, and gets back how much rain they can catch, how big a tank should be, whether recharge is possible, what to build, a 3D view of it, and a PDF.

> **MVP status (2026-10-27):** This document describes the target flow. The shipped MVP covers sign-in, places, the assessment form, results, the 3D view, and browser print/PDF. Rainfall and soil are entered manually in the MVP; automatic NASA POWER/SoilGrids retrieval is deferred. Recharge uses the India CGWB 2007 pack; other regions return `REVIEW_REQUIRED` while yield and tank sizing still run. Photos, permanent PDF storage, MapLibre/polygon drawing, and autosave are deferred; see the root README's "What is deliberately not built".

---

## 1. The user journey

### Step 1 — Sign up / log in

Email and password. No company, no invitation, no admin approval.

From this point on, every place, assessment, photo, and report belongs to this account. Another account cannot see any of it.

### Step 2 — My Places (dashboard)

A grid of cards, one per property:

```text
┌──────────────────────────────┐
│ Sharma residence             │
│ Indore · House               │
│ 2 assessments · last 12 Oct  │
└──────────────────────────────┘
```

Search by name or address. Button: **Add a place**.

### Step 3 — Add a place

- Label ("Sharma residence"), type (house / apartment / school / other)
- Address, and a pin dropped on the map
- Optional: draw the roof outline or plot boundary
- Saved with a short code: `RW-000123`

Nothing is calculated yet. This is just the place.

### Step 4 — Start an assessment

Open the place → **New assessment** → visit date.

Each assessment is a separate record. Starting a new one never changes an old one.

### Step 5 — Fill the survey

Five short sections, each saveable on its own:

| Section | What the user enters | What the app fills in |
| --- | --- | --- |
| **Roof** | Add segments: length × width, or draw the outline. Pick material and condition. | Area, and the runoff coefficient from the cited table |
| **Rainfall** | Nothing, usually | 30 years of monthly rainfall for that pin, from NASA POWER |
| **Demand** | People, litres per person per day (optional) | Annual and monthly demand |
| **Soil and water** | Infiltration test result (mm/hr), test depth, water-table depth and date | Soil type prefilled from SoilGrids as context |
| **Site** | Space available, slope, distance to septic tank or drains, existing tank or pit, photos | — |

Every field can be left blank and marked **unknown**. Blank is not zero.

### Step 6 — Save draft

Autosaves. Close the browser, come back a week later, everything is there. A half-finished assessment is a normal state, not an error.

### Step 7 — Run assessment

One button. This is where the calculation happens.

### Step 8 — Results

The payoff. Described in section 4.

### Step 9 — Generate report

One button. A PDF is created and stored permanently. Download it, or come back for it later.

### Step 10 — Return later

The place is still in My Places. The old assessment and its report are still there. A new assessment can be started alongside it.

---

## 2. What happens behind the scenes

```text
User fills the form
        │
        ▼
Backend gatekeeper
  - Is the user logged in?
  - Does this property belong to them?
  - Is the input in valid units and plausible range?
        │
        ▼
Save as a draft  ──────────────────►  PostgreSQL
        │
        ▼  (user presses "Run")
Freeze an input snapshot
  (the exact numbers, units, and sources used)
        │
        ▼
Calculation engine  — pure Python, no UI, no database
  1. Rooftop yield        P × A × C per segment, summed
  2. Losses               first flush, filter, conveyance — separately
  3. Tank sizing          monthly balance, swept across tank sizes
  4. Recharge feasibility rule table, criterion by criterion
  5. Structure sizing     volume, then a percolation check
        │
        ▼
Save a calculation run  ──────────►  PostgreSQL (append-only)
        │
        ├──► Map snapshot (pin + roof polygon)
        ├──► 2D drawing (SVG, dimensions from the run)
        ├──► 3D scene graph (React Three Fiber)
        └──► Gemini concept render (optional, labelled illustrative)
        │
        ▼
Results page  +  PDF report  ─────►  private file storage
```

### The five parts

| Part | Plain description | What it must never do |
| --- | --- | --- |
| **Frontend** | The screens: forms, map, 3D viewer, results | Decide who can see what |
| **Backend** | The gatekeeper and the saver | Trust an ID sent by the browser |
| **Engine** | The calculator | Talk to the database or the web |
| **Database** | Permanent memory | Let one account read another's rows |
| **Gemini** | Makes a picture | Produce a number |

---

## 3. The calculation, in order

1. **How much rain lands on the roof?**
   `rainfall × roof area`, per segment.
2. **How much runs off?**
   Multiply by the roof coefficient from the cited table.
3. **What is lost before storage?**
   First flush and filter loss, subtracted separately and shown separately.
4. **How much does the household need?**
   People × litres per day × 365.
5. **What tank size actually works?**
   Simulate every month: inflow, demand, storage, overflow. Repeat for candidate tank sizes. Report the smallest tank that meets the user's reliability target, plus the overflow.
6. **Is recharge possible?**
   Walk the rule table. Each criterion returns pass, fail, or unknown. Any required unknown means `INSUFFICIENT_DATA`.
7. **What should be built?**
   Pick the structure the rules allow, size it, then check that it can actually drain the design storm. If it cannot, say so and suggest the next option.

---

## 4. What the results page shows

Top row — the three answers:

```text
  143,000 L / year          10 m³ tank             RECHARGE
  harvestable               ~35% of demand         CONDITIONALLY ELIGIBLE
```

Then, top to bottom:

1. **The water chain** — rain on roof → runoff → minus losses → net → stored → overflow → to recharge. One bar, so the losses are visible, not hidden in a single efficiency number.
2. **Tank sizing curve** — tank size on one axis, reliability on the other. The recommendation is a point on that curve, not a rule of thumb.
3. **Recharge criteria table** — one row per criterion: value, unit, pass/fail/unknown, and the source. This is the most important screen for credibility.
4. **Recommended structure** — type, shape, material, dimensions, capacity, and why this one.
5. **Build specification** — the part a contractor uses:
   - tank schedule (shape, material, L × W × H, gross and usable volume, position)
   - recharge schedule (type, dimensions, depth, clearance above water table, media layers)
   - piping schedule (line, from → to, diameter, length, slope)
   - quantities (excavation, RCC, masonry, media, pipe — no costs)
   - construction sequence
6. **Map** — the pin, the roof polygon, and the measured area.
7. **2D drawing** — tank section and plan, pit section with media layers, pipe route.
8. **3D model** — orbit, zoom, toggle layers, switch between candidate structures.
9. **Concept image** — generated by Gemini, labelled *illustrative, not to scale*.
10. **Download report.**

---

## 5. Worked example (illustrative, with stated assumptions)

A 200 m² tiled roof in a 900 mm/year rainfall area.

| Step | Working | Result |
| --- | --- | --- |
| Rain on roof | 900 mm × 200 m² | 180,000 L |
| Runoff at C = 0.85 | 180,000 × 0.85 | **153,000 L** |
| First flush, 1 mm per month | 0.85 × 1 × 200 × 12 | −2,040 L |
| Filter loss | 5% of the remainder | −7,548 L |
| **Collectible** | | **≈ 143,400 L/yr** |
| Demand, 4 people × 100 L/day | 400 × 365 | 146,000 L/yr |

Annual supply and annual demand look almost equal — which is exactly the trap.

Rain does not fall evenly. Using a typical monsoon distribution, a **10 m³** tank only meets about **35%** of demand, because the dry months drain it. Reaching 80% would need more than **50 m³**, which most plots cannot fit.

So the honest answer is not "build a 70 m³ tank." It is:

> *A 10 m³ tank covers part of the year. Route the monsoon overflow to recharge.*

That single result is the reason the product needs both harvesting and recharge. It also proves the engine is doing real work rather than multiplying two numbers.

*(The monthly rainfall figures here are illustrative. Real values come from NASA POWER for the actual pin, and the tank figure is computed from those.)*

---

## 6. When data is missing

| Missing input | What the system does |
| --- | --- |
| Infiltration test | Recharge = `INSUFFICIENT_DATA`. Says: run a soak test, record mm/hr. |
| Water-table depth | Any structure that must respect depth is blocked. |
| Demand | Yield is still shown; tank sizing says demand is needed. |
| Rainfall | Uses the fetched value; if that fails, asks for a cited manual value. |
| No rule pack for the country | `REVIEW_REQUIRED`: no approved criteria exist for this region. |

The rule everywhere: **missing is missing.** It never becomes zero, never becomes a default, and never becomes a pass.

---

## 7. What the PDF contains

1. Property and assessment summary
2. Map snapshot
3. Inputs used, with units and sources
4. Rooftop yield chain
5. Tank sizing result and curve
6. Recharge criteria table with pass/fail/unknown
7. Recommended structure and dimensions
8. Build specification: tank schedule, recharge schedule, piping schedule, quantities, construction sequence
9. 2D drawing
10. 3D snapshot
11. Concept image, labelled illustrative
12. Warnings and missing inputs
13. Method versions and citations
14. Disclaimer: preliminary, not professionally reviewed

---

## 8. What "done" looks like

A five-minute demo:

1. Register a new account.
2. Add a place, drop a pin.
3. Enter a roof and run it.
4. See the yield, the tank curve, and the 3D model.
5. Add soil and water-table values, run again.
6. Get a recharge verdict with reasons.
7. Generate the concept image and the PDF.
8. Log out, log in, and find everything still there.
9. Log in as a second account and confirm none of it is visible.

---

## 9. What we are not building

- No companies, teams, roles, or sharing
- No offline mode
- No automatic roof detection from images
- No AI deciding a dimension or a threshold
- No claim of professional certification
- No cost estimation in the first release
