# RainWise design rules

**Purpose:** Decide, once, how the system turns a survey into a buildable recommendation. This file is the specification the calculation engine implements. Every number here is either cited or explicitly marked as a project assumption.

**Scope:** Storage tanks, recharge structures, piping, sizing, and the build specification the user receives.

**Standing disclaimer:** these rules are transcribed from published guidance and practical design norms by the project team. No professional engineering review has been performed. Every output is preliminary and must be verified by a qualified engineer before construction.

---

## 1. What the system must output

For every assessment the user receives four things:

| Output | Content |
| --- | --- |
| **Verdict** | Is harvesting possible, is recharge possible, and how confident is the answer |
| **Quantity** | Litres per year, litres per month, litres per storm, litres stored, litres to recharge |
| **Structure** | Type, shape, material, exact dimensions, capacity, and position |
| **Build spec** | Piping schedule, components, quantities, construction sequence, 2D drawing, 3D model |

Nothing is left as "consult an engineer" unless the data genuinely cannot support a decision. When it cannot, the system says exactly what is missing and what test would resolve it.

---

## 2. Water storage tank

### 2.1 Shapes and when each is used

| Shape | Material | Typical capacity | Use when |
| --- | --- | --- | --- |
| Vertical cylinder | HDPE / polyethylene | 0.5 – 2 m³ | Small demand, above ground, quick install, lowest cost |
| Vertical cylinder | RCC or ferrocement | 2 – 15 m³ | Above ground, round footprint available, good head for gravity flow |
| Rectangular | RCC | 5 – 50 m³ | Underground sump, under a driveway or paved area, tight or irregular space |
| Rectangular multi-cell | RCC | > 30 m³ | Large volume, structural span limits, or staged construction |
| Horizontal cylinder | HDPE | 0.5 – 5 m³ | Narrow strip along a wall, low headroom |

**Selection order:**

```text
V_required ≤ 2 m³
    → HDPE vertical cylinder, above ground

2 < V_required ≤ 15 m³, above-ground space available
    → RCC / ferrocement cylinder, above ground

2 < V_required ≤ 15 m³, no above-ground space
    → RCC rectangular sump, underground

V_required > 15 m³, space available
    → RCC rectangular sump, underground, multi-cell above 30 m³

Plot cannot fit the required volume
    → cap the tank at the largest that fits, report the reliability
      it actually achieves, and route overflow to recharge
```

### 2.2 Size catalogue

The engine does not invent a volume. It sweeps a catalogue of buildable sizes and returns the smallest one that meets the reliability target, then rounds up.

**MVP note:** the current engine sweeps the full catalogue and reports the largest practical tank when the reliability target cannot be met. It does not yet filter the tank catalogue by `available_space_m2`; that input is used by the recharge criteria. Confirm the recommended tank footprint against the actual site before construction.

| Type | Catalogue |
| --- | --- |
| HDPE vertical | 0.5, 1.0, 1.5, 2.0 m³ |
| RCC cylinder | D = 1.5, 2.0, 2.5 m × H = 1.5, 2.0, 2.5 m |
| RCC rectangular | depth = 1.5, 2.0, 2.5 m; plan L:W between 1:1 and 2:1; dimensions rounded to 0.1 m |

### 2.3 Volume arithmetic

```text
Cylinder:        V_gross = π/4 × D² × H
Rectangular:     V_gross = L × W × H
Usable volume:   V_usable = L × W × (H − freeboard − dead storage)
Freeboard:       0.20 m above the highest water level
Dead storage:    0.10 m below the outlet
```

Both gross and usable volume are reported. A tank is never described by its gross volume alone.

### 2.4 Placement

The tank position is chosen from the available space entered by the user, in this order:

1. Shaded or north side, away from the building foundation by at least 1.0 m
2. Below the lowest roof outlet where gravity flow is possible
3. Outside the vehicle turning path if underground
4. Never under a load-bearing wall or within 1.0 m of a septic tank

---

## 3. Recharge structure

### 3.1 Types and when each is used

**Region:** the only rule pack in this build is India (`in`, CGWB 2007). Any other region returns `REVIEW_REQUIRED` with a `recharge_rule_pack_missing` warning; yield and tank sizing still run.

| Type | Shape | Dimensions | Use when |
| --- | --- | --- | --- |
| **Recharge pit** | Square or rectangular plan, media-filled | Plan 1.0×1.0 to 3.0×3.0 m; depth 1.5–3.0 m | Infiltration ≥ 15 mm/h, at least 2×2 m free, water table deeper than 5 m |
| **Recharge trench** | Long rectangular, media-filled | Width 0.6–1.0 m; depth 1.5–2.5 m; length 2–20 m | Narrow strip, along a boundary wall, infiltration ≥ 10 mm/h |
| **Recharge shaft** | Circular, lined or unlined | Diameter 0.9–1.5 m; depth down to water table − 3 m | Infiltration < 10 mm/h, or a low-permeability layer must be crossed |
| **Recharge well / bore** | Circular | Requires professional design | Deep or confined aquifer, or no surface space |

### 3.2 Selection decision tree

```text
1. Is a measured infiltration rate available?
       No  → INSUFFICIENT_DATA. Ask for a soak or double-ring test.

2. Is the water table shallower than 3 m?
       Yes → NOT_ELIGIBLE. Too shallow; risk of contamination and poor performance.

3. Is a contamination source (septic tank, soak pit, drain, landfill)
   within 15 m of the proposed structure?
       Yes → NOT_ELIGIBLE. Groundwater protection.

4. Is there at least 2×2 m of free, unpaved space?
       No  → trench if a narrow strip exists, otherwise REVIEW_REQUIRED.

5. Infiltration rate:
       ≥ 15 mm/h  → recharge pit
       10–15 mm/h → trench, or pit with a larger footprint
       < 10 mm/h  → recharge shaft
```

### 3.3 Sizing

```text
Design runoff volume:   V_design = C × I × A × t
    I = design rainfall intensity (default 50 mm/h)
    t = storm duration (default 1 h)

Working volume of a media-filled structure:
    V_working = L × W × D × void_ratio
    void_ratio = 0.40 for masonry-ring pit or trench
               = 1.00 for an open shaft

Percolation check:
    Q_out = k × A_wetted
    k = measured infiltration rate (m/h)
    A_wetted = base area + side area up to the design water level

Accept the structure if:
    V_working + Q_out × t ≥ V_design

Otherwise, step up the catalogue (larger plan, then trench, then shaft).
If the largest available structure still fails, report the fraction of the
design storm it handles and route the remainder to the storm drain.
```

### 3.4 Depth rule

The bottom of any recharge structure must stay **at least 3 m above the water table** (CGWB guidance). The engine caps depth at `water_table_depth − 3 m`. If that cap is below 1.5 m, the site is `NOT_ELIGIBLE` for a recharge structure.

### 3.5 Media layers (pit and trench)

Top to bottom:

| Layer | Thickness | Material |
| --- | --- | --- |
| 1 | 150 mm | Coarse sand |
| 2 | 300 mm | 20 mm gravel |
| 3 | 300 mm | 40 mm gravel |
| 4 | Remainder | 50–100 mm boulders |
| Lining | — | Brick masonry with 20–25% voids, or perforated precast rings |
| Separator | — | Geotextile between native soil and media |
| Top | — | Removable RCC cover with a 0.6 × 0.6 m access opening |

---

## 4. Piping and components

### 4.1 Sizing rules

| Component | Rule | Default |
| --- | --- | --- |
| Gutter | Half-round PVC, slope 1:200 | 150 mm |
| Downpipe | One per 60 m² of roof, minimum 75 mm | 90 mm |
| Downpipe, large roof | Roof > 120 m² | 110 mm |
| First flush | 1 mm of rainfall over the roof area | Volume = area × 1 mm |
| Leaf screen | At every downpipe head | 300 × 300 mm mesh box |
| Filter | Sand-gravel chamber, or a proprietary PP cartridge | Sized to peak flow |
| Tank inlet | Same size as downpipe | 90–110 mm |
| Tank overflow | One size above the inlet | 110 mm |
| Recharge inlet | With a silt trap before the pit | 160 mm |
| Minimum slope | Gravity lines | 1:100 |

### 4.2 Peak flow

```text
Q_peak = C × I × A
Default: 0.85 × 50 mm/h × roof area
Example: 0.85 × 0.05 m/h × 200 m² = 8.5 m³/h = 2.4 L/s
```

The downpipe count and diameter are checked against `Q_peak`, not guessed.

### 4.3 Standard components

1. Gutter with end caps and brackets at 0.75 m centres
2. Downpipe with a leaf screen and a cleanout at the base
3. First-flush diverter: 100–150 mm PVC chamber with a ball valve and drain
4. Filter: 0.6 × 0.6 × 0.9 m masonry chamber with gravel and sand layers, or a PP cartridge
5. Silt trap before the recharge structure
6. Tank inlet with a calmed entry, overflow with a mosquito screen
7. Access manhole 0.6 × 0.6 m, vent pipe, and a level indicator
8. Outlet: gravity tap if the tank is above ground, or a pump if underground

### 4.4 System layout

```text
Roof
  └── Gutter (150 mm, 1:200)
        └── Downpipe (90–110 mm, leaf screen)
              └── First flush (1 mm)
                    └── Filter (sand-gravel)
                          ├── Tank inlet
                          │     └── Tank → overflow
                          └── Recharge inlet (silt trap) → pit / trench / shaft
```

When both storage and recharge exist, the tank fills first and its overflow feeds the recharge structure. This is the normal arrangement and is what the engine recommends whenever the tank cannot meet demand alone.

---

## 5. Design event

| Parameter | Default | Status |
| --- | --- | --- |
| Rainfall intensity | 50 mm/h | Project assumption, common Indian municipal norm. Replace with the local bylaw value when known. |
| Storm duration | 1 hour | Project assumption |
| Design volume | `C × I × A × t` | Derived |

The design event is a configurable value in the regional rule pack. It is never hard-coded inside a formula.

---

## 6. Combined system logic

```text
Compute yield, demand, and tank reliability.
Compute recharge feasibility.

Tank meets the reliability target
    → recommend storage only.
      Overflow to storm drain.

Tank does not meet the target AND recharge is eligible
    → recommend storage + recharge.
      Tank sized to the largest that fits; overflow routed to the pit/trench/shaft.
      Report: tank reliability, recharge volume per year, combined coverage.

Tank does not meet the target AND recharge is not eligible
    → recommend storage only.
      State clearly that the remaining demand is unmet and why recharge was excluded.

Neither is possible
    → no system recommended. List the blocking constraints.
```

---

## 7. Build specification output

This is the section the user actually takes to a contractor.

### 7.1 System summary

```text
Recommended system: Storage + recharge
Tank:      RCC rectangular sump, 6.0 × 3.0 × 2.5 m, 45 m³ gross, 39.6 m³ usable
Recharge:  Recharge pit, 3.0 × 3.0 × 2.5 m, media-filled, 9.0 m³ working volume
Coverage:  39.6 m³ tank supplies ~60% of demand; pit handles 100% of the design storm
```

### 7.2 Tank schedule

| Item | Value |
| --- | --- |
| Shape | Rectangular |
| Material | RCC M20, 150 mm walls, 100 mm base |
| Internal dimensions | L × W × H |
| Gross / usable volume | m³ and litres |
| Freeboard / dead storage | 0.20 m / 0.10 m |
| Position | Described relative to the building and boundary |
| Access | 0.6 × 0.6 m manhole, vent, level indicator |

### 7.3 Recharge schedule

| Item | Value |
| --- | --- |
| Type | Pit / trench / shaft |
| Shape | Square / rectangular / circular |
| Internal dimensions | L × W × D or D × D |
| Working volume | m³ |
| Depth below ground | m |
| Clearance above water table | m |
| Media layers | As §3.5 |
| Lining | Masonry with voids / perforated rings |
| Inflow | Pipe size, silt trap |

### 7.4 Piping schedule

| Line | From → To | Size | Length | Slope |
| --- | --- | --- | --- | --- |
| P1 | Gutter → downpipe | 150 mm | 28.3 m | 1:200 |
| P2 | Downpipe → first flush | 110 mm | 24.0 m | vertical |
| P3 | First flush → filter | 110 mm | 1.5 m | 1:100 |
| P4 | Filter → tank inlet | 110 mm | 5.0 m | 1:100 |
| P5 | Tank overflow → recharge | 110 mm | 3.0 m | 1:100 |
| P6 | Recharge inlet → pit | 160 mm | 2.0 m | 1:100 |

Lengths are computed from the roof geometry and the chosen positions, not typed in by the user.

### 7.5 Quantities (no costs)

| Item | Unit | Quantity |
| --- | --- | --- |
| Excavation | m³ | 67.5 |
| RCC | m³ | 10.35 |
| Masonry | m³ | 4.14 |
| Filter media | m³ | 9.0 |
| PVC pipe 110 mm | m | 33.5 |
| PVC pipe 150 mm | m | 28.3 |
| PVC pipe 160 mm | m | 2.0 |
| Geotextile | m² | 39.0 |

### 7.6 Construction sequence

1. Mark the tank and structure positions; confirm clearances
2. Excavate; keep the pit bottom above the water table
3. Construct the tank base, walls, and cover; cure
4. Construct the pit lining and place media in layers with geotextile
5. Install gutters, downpipes, first flush, and filter
6. Install inlet, overflow, and silt trap; test with water
7. Commission: flush the first rain, check for leaks, label the valves

### 7.7 Visuals

- 2D dimensioned drawing: tank section and plan, pit section with media layers, pipe route plan
- 3D model: building mass, roof planes, tank, pit, pipe route, dimension labels
- AI concept render: illustrative only, labelled not to scale

---

## 8. All defaults in one place

| Parameter | Default | Status |
| --- | --- | --- |
| Runoff coefficient | Per material table | CPWD Table 2, p. 14; IS 15797:2008 §5.1, p. 2. Tiles 0.85 is verified; concrete, metal, asbestos, and other are pending review (see methodology §3). |
| First flush | 1 mm | Common practice |
| Filter loss | 5% of runoff | Project assumption, configurable |
| Household demand | 4 people × 100 L/day | Project assumption, editable |
| Reliability target | 80% | User choice |
| Freeboard | 0.20 m | Practice |
| Dead storage | 0.10 m | Practice |
| Design intensity | 50 mm/h for 1 h | Project assumption |
| Pit void ratio | 0.40 | Media-filled masonry |
| Water-table clearance | 3 m | CGWB FAQ (2025), PDF pp. 17–18 and 23; the FAQ gives 3–5 m, RainWise uses the minimum 3 m |
| Contamination setback | 15 m | Project assumption, check local rules |
| Percolation safety factor | 1.5 | Practice |
| Minimum tank size | 0.5 m³ | Catalogue |
| Maximum practical tank | 50 m³ | Beyond this, multi-cell or reconsider |

The full source register, page references, formulas, and worked examples are in `docs/ENGINEERING_METHODOLOGY.md`. The design defaults above that are not direct transcriptions are labelled project assumptions there; they are not CGWB values.

---

## 9. What still needs local verification

These are the numbers a local engineer or municipal bylaw would override. They are configurable, not buried in code:

1. Design rainfall intensity for the region
2. Contamination setback distance
3. Local groundwater protection rules
4. Whether underground tanks are permitted on the site
5. Local material and construction practice

The system states which of these were assumed in every report.
