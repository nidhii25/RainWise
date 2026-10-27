# RainWise engineering methodology

**Status:** Working methodology, 2026-10-28. This document records the sources, formulas, assumptions, and worked examples behind every number the RainWise engine produces.

**Important:** RainWise is a preliminary screening tool. The rules below are transcribed from published guidance and from clearly labelled project assumptions. No qualified civil or hydrogeology professional has reviewed the formulas, the selected values, or the outputs. Every recommendation must be checked by a qualified engineer before construction.

**Engine version:** `rainwise-1.0`  
**Rule files:** `backend/app/engineering/rules/coefficients.yaml` and `backend/app/engineering/rules/in/cgwb-2007.yaml`  
**Code entry point:** `backend/app/engineering/design.py`

---

## 1. What this document covers

1. The source register and the exact page references.
2. The runoff coefficients, including which values are direct transcriptions and which are RainWise design selections.
3. The rooftop yield calculation.
4. The monthly water-balance tank sizing.
5. The recharge decision and its five states.
6. The pit, trench, and shaft sizing.
7. The piping and quantity assumptions.
8. A complete worked example that reproduces the reference assessment.
9. The limitations and the items a reviewer must check.

The guiding rule is simple: **no artificial-intelligence output is used as an engineering input.** AI may help a developer locate a document; it is never the source of a coefficient, threshold, dimension, or feasibility decision. Synthetic data is used only in labelled tests and demos.

---

## 2. Source register

| ID | Source | Exact location | What RainWise uses it for | Status |
| --- | --- | --- | --- | --- |
| `cpwd` | CPWD, *Rain Water Harvesting* (Government of India) | **Table 2, p. 14**, "Runoff Co-efficient of Various Surfaces" | Roof runoff coefficients | Table verified |
| `cpwd_reproduction` | CSE India, *Technical Design of Rainwater Harvesting* (2016) | Slide "Runoff Coefficients and RWH potential"; reproduces the CPWD 2002 table | Cross-check of the CPWD ranges where the PDF text layer is imperfect | Verified |
| `is15797` | IS 15797:2008, *Roof Top Rainwater Harvesting — Guidelines* (BIS) | **Clause 5.1, p. 2** | General roof runoff range 0.8–0.95; asbestos-cement fallback | Verified |
| `cgwb2007` | CGWB, *Manual on Artificial Recharge of Ground Water* (2007) | **Table 5.3, pp. 48–50**; **§6.2.3.3, pp. 91–92**; **§6.2.3.3.1.1, pp. 91–92**; **§6.2.3.3.2.1, p. 92** | Structure suitability; pit and shaft construction guidance; requirement to test infiltration | Verified |
| `cgwb_faq` | CGWB, *Frequently Asked Questions — Artificial Recharge* (2025) | **PDF pp. 17–18 and 23** | Stop 3–5 m above the water table; avoid recharge where the post-monsoon water level is less than 3 m below ground | Verified |
| `project` | RainWise project assumptions | This document, §8 | First flush, filter loss, demand, reliability target, freeboard, dead storage, void ratios, design storm, structure thresholds, setback, safety factor, maximum depths | Assumption |

Page references are printed page numbers unless marked **PDF**. The CGWB manual and CPWD manual page numbers are printed pages; the CGWB FAQ is cited by PDF page because its printed numbering is inconsistent in the extracted copy.

### 2.1 What the CGWB Table 5.3 actually says

Table 5.3 is a qualitative suitability matrix, not a table of numeric thresholds. It groups hydrogeological settings and lists the structures that may be suitable:

| Group | Setting | Structures listed in Table 5.3 | Page |
| --- | --- | --- | --- |
| I | Consolidated formations (crystalline rock, basalt, hard sedimentary rock) | Percolation tanks, nalah bunds, gully plugs, contour bunds, bench terracing, **recharge pits and shafts**, gravity recharge wells, induced recharge wells in favourable situations, groundwater dams, fracture sealing, borehole blasting, hydrofracturing | p. 48 |
| II | Semi-consolidated formations (sandstone, shale, limestone, coal measures) | Percolation tanks, nalah bunds, gully plugs, bench terracing, contour bunds, groundwater dams, stream modification, recharge basins, **pits and shafts**, gravity recharge wells, induced recharge; injection wells for confined aquifers | p. 49 |
| III | Unconsolidated formations (alluvium, boulder/cobble/gravel beds, coastal alluvium) | Flooding, ditch and furrow, contour trenches, recharge basins, stream modification, surface irrigation, injection wells, connector wells, **recharge pits and shafts**, induced recharge | p. 50 |

RainWise does **not** ask the user for a geological group. It uses the measured infiltration rate and the water-table depth, and it uses Table 5.3 only as a qualitative cross-check: pits and shafts are listed for all three groups, so the engine's pit/shaft options are consistent with the manual. The numerical thresholds that choose between pit, trench, and shaft are project assumptions (§8), not CGWB values.

### 2.2 What the CGWB manual does not say

The manual does **not** provide the following numbers, which are therefore labelled as RainWise assumptions:

- the 15 mm/h and 10 mm/h infiltration thresholds;
- the 4 m² minimum available space;
- the 15% maximum slope;
- the 15 m contamination setback;
- the 1.5 percolation safety factor;
- the 50 mm/h, 1-hour design storm;
- the 0.40 pit and trench void ratios;
- the maximum pit, trench, and shaft depths.

The manual does say that infiltration must be measured before a pit is built (§6.2.3.3.1.1(ii)), that pits should have 2:1 side slopes and a sand layer, that shafts may be about 2 m in diameter if hand-dug and not more than 1 m if drilled, and that a shaft should penetrate the low-permeability layer but need not reach the water table.

---

## 3. Runoff coefficients

### 3.1 Transcribed ranges

CPWD Table 2 (p. 14) gives ranges for roof catchments. The CPWD PDF text layer is imperfect, so the ranges were cross-checked against the CSE India reproduction of the same table (2016):

| Roof material | CPWD range | IS 15797 range (Clause 5.1) | RainWise value | Value status | Basis |
| --- | --- | --- | --- | --- | --- |
| Tiles | 0.80–0.90 | 0.80–0.95 | **0.85** | `verified` | CPWD's own worked example uses 0.85 for a tiled roof. |
| Concrete | 0.70–0.95 | 0.80–0.95 | **0.85** | `pending` | A mid-range design value, the same as the CPWD tiles example. The exact single value is not a CPWD row. |
| Corrugated metal | 0.70–0.90 | 0.80–0.95 | **0.90** | `pending` | The upper end of the CPWD range, appropriate for smooth sheet metal. The lower end is the conservative alternative. |
| Asbestos-cement | Not in the reproduced CPWD rows | 0.80–0.95 | **0.80** | `pending` | The reproduced CPWD rows list tiles, corrugated metal, and concrete only. IS 15797 gives a general roof range, not a material-specific row. The lower bound is used conservatively. |
| Other / unknown | — | 0.80–0.95 | **0.80** | `pending` | Conservative fallback. A `coefficient_fallback` warning is emitted. |

### 3.2 Why the selected values remain `pending`

The CPWD table states ranges, not single coefficients. A range cannot be turned into a single number without a selection rule, and a selection rule is an engineering judgment. RainWise keeps the selection visible:

- the **range and page number are verified**;
- the **single value is a RainWise design value**;
- the value remains `pending` until a qualified reviewer confirms the selection.

This is deliberate. Marking a selected single value as `verified` would imply that CPWD states that exact number, which it does not. The engine emits an informational `coefficient_pending` warning for every non-verified row, and the report carries the standing preliminary-results disclaimer.

If a reviewer prefers a different selection rule, the values can be changed in `coefficients.yaml` without touching the formulas. The conservative alternative is to use the lower bound of each range; that reduces the estimated yield but avoids overestimating the supply.

---

## 4. Rooftop yield

### 4.1 Gross rainfall

For each roof segment `i`:

```text
V_gross_i (m³) = P_annual (mm) × A_i (m²) / 1000
V_gross (m³)   = Σ V_gross_i
```

`1 mm` of rain on `1 m²` is `1 litre`, so `mm × m² / 1000` is cubic metres.

### 4.2 Runoff

```text
V_runoff_i (m³) = P_annual (mm) × A_i (m²) × C_i / 1000
V_runoff (m³)   = Σ V_runoff_i
```

`C_i` is the material coefficient, or a user-supplied coefficient for that segment. A user-supplied coefficient overrides the table and is not warned about.

### 4.3 First flush

The first flush is diverted once per month, using the shallower of the configured first-flush depth and that month's rainfall:

```text
V_first_flush_month (m³) = min(1 mm, P_month) × A × C / 1000
V_first_flush (m³)       = Σ over 12 months
```

If only annual rainfall is available, the engine assumes one first-flush event per month:

```text
V_first_flush (m³) = 12 × 1 mm × A × C / 1000
```

The default first-flush depth is **1 mm**. This is a project assumption and is configurable.

### 4.4 Filter and conveyance loss

```text
V_after_first_flush = max(0, V_runoff − V_first_flush)
V_filter_loss       = V_after_first_flush × 0.05
V_net               = V_after_first_flush − V_filter_loss
```

The default filter loss is **5% of the runoff after first flush**. It represents the settling, filter, and conveyance losses. It is a project assumption.

### 4.5 Monthly net inflow

When a monthly rainfall series is supplied:

```text
V_net_month = max(0, V_runoff_month − V_first_flush_month) × (1 − 0.05)
```

This 12-value series drives tank sizing. Annual yield alone cannot size a tank reliably because the monsoon delivers most of the annual total in a few months.

### 4.6 Worked example

Inputs:

- Roof area `A = 200 m²`, material `tiles`, `C = 0.85`;
- Annual rainfall `P = 900 mm`;
- Monthly rainfall: `5, 5, 5, 5, 10, 140, 300, 250, 130, 35, 10, 5 mm`.

Calculations:

```text
V_gross  = 900 × 200 / 1000                     = 180.000 m³
V_runoff = 180 × 0.85                           = 153.000 m³
V_first  = 12 × 1 × 200 × 0.85 / 1000           =   2.040 m³
V_after  = 153.000 − 2.040                      = 150.960 m³
V_filter = 150.960 × 0.05                       =   7.548 m³
V_net    = 150.960 − 7.548                      = 143.412 m³
```

`143.412 m³ = 1,43,412 litres per year`, the figure shown in the reference report.

Monthly net inflow (m³), rounded to three decimals:

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.646 | 0.646 | 0.646 | 0.646 | 1.454 | 22.449 | 48.289 | 40.213 | 20.833 | 5.491 | 1.454 | 0.646 |

The sum is 143.412 m³ (rounding explains the last 0.001).

---

## 5. Tank sizing by monthly water balance

### 5.1 Demand

```text
Annual demand (m³)  = people × litres_per_person_per_day × 365 / 1000
Monthly demand (m³) = annual demand / 12
```

Default: `4 people × 100 L/day = 400 L/day = 146 m³/year`, or `12.1667 m³/month`. Both the number of people and the per-person demand are editable.

### 5.2 Simulation order

For each month, the engine applies the operations in a fixed order:

1. Add the monthly net inflow to the stored volume.
2. If the stored volume exceeds the tank's usable capacity, the excess overflows.
3. Draw demand from the stored volume, up to the available volume.
4. The remaining stored volume carries into the next month; it can never go negative.

```text
available  = stored + inflow
overflow   = max(0, available − capacity)
stored_pre = min(capacity, available)
actual_use = min(monthly_demand, stored_pre)
stored     = stored_pre − actual_use
unmet      = monthly_demand − actual_use
```

### 5.3 Warm-up and reliability

The 12-month series is repeated for **two warm-up years** before scoring, so the result does not depend on the tank starting empty in January. Only the final 12 months are scored.

```text
reliability = 1 − (total unmet demand / total demand)
```

Reliability is therefore the **fraction of annual demand met by the tank**, not the probability that a particular day has water. A tank with 60% reliability meets 60% of the annual demand and leaves 40% unmet; it is not a 60% chance of success.

### 5.4 Tank catalogue and usable volume

The catalogue contains:

- HDPE cylinders from about 0.5 m³ to 2 m³;
- RCC/ferrocement cylinders from about 1.5 m³ to 20 m³ gross;
- RCC rectangular tanks from 2 m³ to 50 m³ gross;
- near-identical usable volumes are de-duplicated, keeping the smallest footprint.

Usable volume removes **0.20 m freeboard** and **0.10 m dead storage**:

```text
Usable height = gross height − 0.30 m
Usable volume = plan area × usable height
```

For a rectangular tank `6.0 × 3.0 × 2.5 m`:

```text
Gross  = 6.0 × 3.0 × 2.5            = 45.0 m³
Usable = 6.0 × 3.0 × (2.5 − 0.30)   = 39.6 m³
```

### 5.5 Selection rule

The engine scores every catalogue option and chooses the **smallest usable volume whose reliability is at least the target**. The default target is **80%**.

If no catalogue tank reaches the target, the engine recommends the largest practical tank, reports its actual reliability, and emits `tank_cannot_meet_target`. It does not silently claim that the target was met.

### 5.6 Worked example

With the monthly inflow above and `12.1667 m³/month` demand:

- No catalogue tank reaches 80%.
- The largest practical tank is `RCC rectangular 6 × 3 × 2.5 m`, `39.6 m³` usable.
- Reliability = **60.09%**.
- Overflow = **55.684 m³/year**.
- Unmet demand = **58.272 m³/year**.
- Months empty = **6**.

Check: `39.6 m³` usable, annual inflow `143.412 m³`, demand `146 m³`. The tank cannot store the monsoon surplus for the dry months, so it overflows during the wet season and runs dry later. This is why the recommendation is **storage + recharge**, not a larger tank alone.

---

## 6. Recharge decision

### 6.1 Five states

| State | Meaning |
| --- | --- |
| `ELIGIBLE` | Every required criterion passed. |
| `CONDITIONALLY_ELIGIBLE` | Every criterion passed, but the selected structure handles less than 100% of the design storm; the remainder must go to a drain. |
| `NOT_ELIGIBLE` | At least one hard criterion failed. |
| `INSUFFICIENT_DATA` | A required value is missing; missing is never treated as zero or pass. |
| `REVIEW_REQUIRED` | A value needs professional review, or no rule pack exists for the region. |

Precedence, strongest first:

```text
NOT_ELIGIBLE > INSUFFICIENT_DATA > REVIEW_REQUIRED > ELIGIBLE
```

### 6.2 Criteria in the India pack

| Criterion | Input | Rule | If missing | Source |
| --- | --- | --- | --- | --- |
| Measured infiltration rate | `infiltration_mm_per_hr` | Must be present | `INSUFFICIENT_DATA` | CGWB 2007 §6.2.3.3.1.1(ii): test before designing a pit |
| Depth to water table | `water_table_depth_m` | ≥ 3.0 m | `INSUFFICIENT_DATA` | CGWB FAQ (2025), pp. 17–18, 23 |
| Contamination setback | `contamination_distance_m` | ≥ 15.0 m | `REVIEW_REQUIRED` | RainWise assumption; local rules override |
| Available space | `available_space_m2` | ≥ 4.0 m² | `INSUFFICIENT_DATA` | RainWise assumption |
| Ground slope | `slope_pct` | ≤ 15% | `REVIEW_REQUIRED` | RainWise assumption |

The water-table criterion is a **hard fail below 3 m**, not a warning. CGWB advises against recharge where the post-monsoon water level is less than 3 m below ground because it may cause waterlogging. Storage-only can still be recommended in that case.

The 15 m contamination setback is a conservative project assumption, not a CGWB number. The CGWB FAQ advises against recharge near industrial, chemical, or hazardous-waste areas; it does not prescribe a universal distance. A local engineer or bylaw must confirm the setback.

### 6.3 Region handling

Only the India pack (`in`, CGWB 2007) exists. A request for any other region returns:

- `status = REVIEW_REQUIRED`;
- a `recharge_rule_pack_missing` warning;
- no recharge structure;
- rooftop yield and tank sizing still run.

Region input is validated as `^[A-Za-z]{2,8}$` and normalized to lowercase. Path traversal such as `../in` is rejected with HTTP 422.

---

## 7. Recharge structure sizing

### 7.1 Design storm

```text
V_design (m³) = A_roof (m²) × C_weighted × I (mm/h) × t (h) / 1000
```

Defaults: `I = 50 mm/h`, `t = 1 h`. These are project assumptions, not CGWB values. A local bylaw value should replace them.

For the reference example:

```text
A = 200 m², C = 0.85, I = 50 mm/h, t = 1 h
V_design = 200 × 0.85 × 50 × 1 / 1000 = 8.5 m³
```

### 7.2 Structure type

The engine uses the measured infiltration rate and the available space:

| Condition | Structure |
| --- | --- |
| Infiltration ≥ 15 mm/h **and** space ≥ 4 m² | Pit |
| Infiltration ≥ 10 mm/h (and the pit condition is not met) | Trench |
| Infiltration < 10 mm/h | Shaft |

These thresholds are **RainWise assumptions**. CGWB describes pits and shafts but does not set 15/10 mm/h cut-offs. The trench is RainWise's media-filled subsurface adaptation of the manual's trench/ditch-and-furrow family; it is not a direct CGWB design table.

### 7.3 Depth and clearance

```text
Clearance limit = water_table_depth − 3.0 m
```

A structure is only considered if `clearance limit ≥ 1.5 m`. The actual depth is capped by both the clearance limit and the type's maximum depth:

| Type | Maximum depth used |
| --- | --- |
| Pit | 3.0 m |
| Trench | 2.5 m |
| Shaft | 10.0 m |

The clearance above the water table is reported as `water_table_depth − actual_depth`. It must remain at least 3 m by construction; the `clearance limit ≥ 1.5 m` check is a separate minimum for a viable structure.

### 7.4 Pit sizing

For a square pit of side `s` and depth `d`:

```text
Working volume  = s² × d × 0.40
Wetted area     = s² + 4 × s × d
Percolation     = k (m/h) × wetted area / 1.5
Fraction handled = min(1, (working volume + percolation × 1 h) / design volume)
```

`k` is the measured infiltration rate converted from mm/h to m/h. The **1.5** safety factor is a project assumption. The wetted area includes the bottom and the four side walls; it is a screening estimate, not a groundwater mounding or residence-time analysis.

### 7.5 Trench sizing

For a rectangular trench of length `L`, width `W`, and depth `d`:

```text
Working volume  = L × W × d × 0.40
Wetted area     = L×W + 2×L×d + 2×W×d
Percolation     = k × wetted area / 1.5
```

The engine tries widths `0.6, 0.8, 1.0 m`, lengths `2–20 m` in 1 m steps, and depths `1.5, 2.0, 2.5 m`, subject to the available space and clearance limit.

### 7.6 Shaft sizing

For a circular shaft of diameter `D` and depth `d`:

```text
Working volume  = (π/4) × D² × d × 1.00
Wetted area     = π × D × d + (π/4) × D²
Percolation     = k × wetted area / 1.5
```

Diameters `0.9, 1.2, 1.5 m` and integer depths from 3 m to the clearance limit are considered. A shaft always carries a `shaft_requires_review` warning because it may cross a low-permeability layer.

### 7.7 Selection rule

The engine prefers the **smallest working volume that handles at least 100% of the design storm**. If no candidate reaches 100%, it returns the candidate with the largest fraction handled and the recharge status becomes `CONDITIONALLY_ELIGIBLE` (if it was `ELIGIBLE`). The report states the fraction and that the remainder must overflow to a drain.

### 7.8 Media layers

Pits and trenches use a standard filter pack:

| Order | Thickness | Material |
| --- | --- | --- |
| 1 | 150 mm | Coarse sand |
| 2 | 300 mm | 20 mm gravel |
| 3 | 300 mm | 40 mm gravel |
| 4 | Remaining depth | 50–100 mm boulders |

Shafts are open (no media layers in the output), but the CGWB manual recommends an inverse filter of boulders/cobbles, gravel, and sand for unlined shafts. The report's note tells the user that a shaft needs professional review.

### 7.9 Worked example

Reference site: infiltration `25 mm/h`, water table `12 m`, contamination distance `30 m`, available space `20 m²`, slope `2%`.

```text
Clearance limit = 12 − 3 = 9.0 m          (≥ 1.5 m, so a structure is possible)
Type             = pit (25 ≥ 15 mm/h and 20 ≥ 4 m²)
Design volume    = 8.5 m³
Chosen pit       = 3.0 × 3.0 × 2.5 m
Working volume   = 3² × 2.5 × 0.40 = 9.0 m³
Wetted area      = 3² + 4×3×2.5 = 39.0 m²
k                = 25 mm/h = 0.025 m/h
Percolation      = 0.025 × 39.0 / 1.5 = 0.65 m³/h
Handled          = 9.0 + 0.65 × 1 = 9.65 m³ ≥ 8.5 m³ → 100%
Clearance        = 12 − 2.5 = 9.5 m
```

This reproduces the reference report: **pit 3.0 × 3.0 × 2.5 m, 9.0 m³ working volume, 0.65 m³/h percolation, 100% of the 8.5 m³ design storm, 9.5 m clearance**.

---

## 8. Project assumptions

These are the values that are **not** direct transcriptions. They are configurable in the rule files and must be replaced by local bylaw or site-specific values where available.

| Parameter | Default | Basis |
| --- | --- | --- |
| First-flush depth | 1 mm per event | Common practice; project assumption |
| Filter and conveyance loss | 5% of runoff after first flush | Project assumption |
| Household demand | 4 people × 100 L/person/day | Project assumption; editable |
| Reliability target | 80% | User choice; default |
| Freeboard | 0.20 m | Practice; project assumption |
| Dead storage | 0.10 m | Practice; project assumption |
| Design storm | 50 mm/h for 1 hour | Project assumption; replace with local design storm |
| Pit void ratio | 0.40 | Media-filled masonry; project assumption |
| Trench void ratio | 0.40 | Media-filled trench; project assumption |
| Shaft void ratio | 1.00 | Open shaft; project assumption |
| Percolation safety factor | 1.5 | Project assumption |
| Water-table clearance | 3.0 m | CGWB FAQ says 3–5 m; RainWise uses the minimum 3 m |
| Contamination setback | 15 m | Project assumption; local rules override |
| Minimum available space | 4 m² | Project assumption |
| Maximum slope | 15% | Project assumption |
| Pit threshold | 15 mm/h | Project assumption |
| Trench threshold | 10 mm/h | Project assumption |
| Maximum pit depth | 3.0 m | Project assumption |
| Maximum trench depth | 2.5 m | Project assumption |
| Maximum shaft depth | 10.0 m | Project assumption |

The design storm is deliberately not hard-coded in a formula: it lives in the region rule pack so a local value can replace it without changing the engine.

---

## 9. Piping and quantities

### 9.1 Piping schedule

The engine derives a preliminary schedule, not a hydraulic design:

| Line | Purpose | Diameter rule | Length rule | Slope |
| --- | --- | --- | --- | --- |
| P1 | Roof gutter | 150 mm | User eave length, or `2 × √area` for a square roof | 1:200 |
| P2 | Downpipe | 75 mm ≤50 m²; 90 mm ≤120 m²; 110 mm above | Building height × downpipe count | Vertical |
| P3 | First flush to filter | Same as downpipe | 1.5 m | 1:100 |
| P4 | Filtered inlet to tank | At least 90 mm | Tank distance | 1:100 |
| P5 | Tank overflow to recharge | At least 110 mm | Recharge distance | 1:100 |
| P6 | Recharge inlet | 160 mm | 2.0 m | 1:100 |

Downpipe count is `max(1, ceil(roof area / 60 m²))`. These rules are project assumptions and must be checked against the local plumbing code and the actual roof layout. The schedule does not calculate hydraulic capacity, head loss, or surge.

### 9.2 Quantities

The quantity take-off is approximate and has **no costs**:

- tank gross volume;
- tank excavation (equal to gross volume for a rectangular tank; zero for a cylinder in the current code);
- RCC walls, base, and cover using 150 mm walls, 100 mm base, 100 mm cover;
- recharge excavation (`plan area × depth`);
- masonry lining (`perimeter × depth × 0.23 m × 0.60 solid fraction`);
- filter media equal to the working volume for pits and trenches;
- geotextile (`plan area + perimeter × depth`);
- PVC pipe lengths by diameter.

For the reference example the main quantities are: total excavation `67.5 m³` (45.0 tank + 22.5 pit), RCC `10.35 m³`, pit lining `4.14 m³`, filter media `9.0 m³`, geotextile `39.0 m²`, and PVC pipe `33.5 m` of 110 mm, `28.3 m` of 150 mm, and `2.0 m` of 160 mm.

These are screening quantities for a contractor's first quote. They exclude reinforcement detailing, formwork, excavation support, disposal, bedding, valves, screens, and finishes.

---

## 10. Complete worked reference assessment

| Item | Value |
| --- | --- |
| Roof | 200 m², tiles, `C = 0.85` |
| Annual rainfall | 900 mm |
| Monthly rainfall | 5, 5, 5, 5, 10, 140, 300, 250, 130, 35, 10, 5 mm |
| Demand | 4 people × 100 L/day = 146 m³/year |
| Reliability target | 80% |
| Gross rainfall | 180.0 m³/year |
| Runoff | 153.0 m³/year |
| First flush | 2.04 m³/year |
| Filter loss | 7.548 m³/year |
| Net yield | 143.412 m³/year = **1,43,412 L/year** |
| Tank | RCC rectangular 6 × 3 × 2.5 m, 45 m³ gross, 39.6 m³ usable |
| Tank reliability | 60.09% (below the 80% target) |
| Tank overflow | 55.684 m³/year |
| Unmet demand | 58.272 m³/year |
| Recharge status | `ELIGIBLE` |
| Design storm | 8.5 m³ |
| Structure | Pit 3.0 × 3.0 × 2.5 m |
| Working volume | 9.0 m³ |
| Percolation | 0.65 m³/h |
| Fraction handled | 100% |
| Clearance above water table | 9.5 m |
| System | Storage + recharge |

The report also carries the warning `tank_cannot_meet_target`: no catalogue tank reaches 80%, so overflow is routed to recharge.

---

## 11. Limitations and required review

RainWise is not a substitute for a site investigation or a professional design. The following are **not** modelled:

- water quality, first-rain contamination, or treatment for potable use;
- soil classification, permeability stratification, or a groundwater mound;
- groundwater flow direction, salinity, or nearby abstraction;
- structural design of the tank, pit lining, or shaft;
- uplift, buoyancy, or soil bearing;
- local rainfall intensity–duration–frequency curves;
- local plumbing, building, or groundwater protection bylaws;
- construction access, excavation support, or dewatering;
- roof condition, gutter hydraulics, or downpipe capacity;
- automatic NASA POWER rainfall or SoilGrids texture retrieval (both are manual inputs in this build);
- recharge rule packs outside India;
- AI-generated concept images are illustrative and never set a dimension.

A qualified reviewer should check, at minimum:

1. the selected runoff coefficient for the actual roof material and condition;
2. the design storm against the local bylaw;
3. the infiltration test method, depth, and date;
4. the water-table level and its seasonal variation;
5. the contamination setback and groundwater protection rules;
6. the structural design and excavation safety;
7. the overflow route and the site drainage;
8. the quantity take-off against a contractor's survey.

---

## 12. Change control

- The engine reports `method_version = rainwise-1.0`.
- Every assessment stores an input snapshot and a result snapshot, so a later rule change never rewrites history.
- The coefficient table and the India rule pack each carry a version number.
- A change to a coefficient, threshold, or design default requires a new rule version, a test update, and a note in this document.
- No AI output is written into a rule file. AI-generated images are stored and displayed separately, labelled "illustrative, not to scale."

---

## 13. References

1. Central Public Works Department (CPWD), Government of India. *Rain Water Harvesting.* Table 2, p. 14. `https://www.cpwd.gov.in/Publication/rain_wh.pdf`
2. Centre for Science and Environment (CSE), India. *Technical Design of Rainwater Harvesting*, 2016. Slide "Runoff Coefficients and RWH potential" (reproduces the CPWD 2002 table). `https://cdn.cseindia.org/userfiles/Technical-Design-of-RWH.pdf`
3. Bureau of Indian Standards. *IS 15797:2008 — Roof Top Rainwater Harvesting: Guidelines.* Clause 5.1, p. 2. `https://www.icid.org/rfwaterharvesting_guidelines.pdf`
4. Central Ground Water Board (CGWB), Ministry of Jal Shakti. *Manual on Artificial Recharge of Ground Water*, 2007. Table 5.3, pp. 48–50; §6.2.3.3, pp. 91–92. `https://cgwa.mowr.gov.in/Documents/Manual-Artificial-Recharge.pdf`
5. Central Ground Water Board (CGWB). *Frequently Asked Questions — Artificial Recharge*, 2025. PDF pp. 17–18, 23. `https://cgwb.gov.in/sites/default/files/2025-02/faq_artificialrecharge_final_forwebsite_english.pdf`
6. RainWise project assumptions: `docs/DESIGN_RULES.md` §8 and this document §8.
