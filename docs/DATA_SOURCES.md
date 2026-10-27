# RainWise data sources

**Status:** Draft, started 2026-10-27. Sources below were located during planning. The MVP accepts rainfall and soil as manual inputs; the NASA POWER and SoilGrids endpoints are documented for lookup and verification, not yet called automatically. Exact parameter names, units, and licence terms must be confirmed before automatic retrieval is added.

**Purpose:** Record where every number in a RainWise calculation comes from, so a reviewer can trace any result back to a citable source or to a site measurement.

---

## 1. Rules

1. **Every input is one of three things:** an official dataset value, a site measurement entered by the user, or an explicit unknown. There is no fourth category.
2. **No AI-generated engineering value ever enters a calculation.** Not rainfall, not a coefficient, not a threshold, not a dimension. An AI may help a developer *find* a source; it may not *be* the source.
3. **Synthetic data is for tests and demos only**, and must be labelled as synthetic in the record.
4. **Unknown is a valid result.** A missing input produces `INSUFFICIENT_DATA`, never a default.
5. **Every stored value carries its source id, unit, and retrieval date.**

---

## 2. Rainfall

### Primary: NASA POWER

| Field | Value |
| --- | --- |
| Dataset | NASA Prediction Of Worldwide Energy Resources (POWER), Analysis Ready Data |
| API | `https://power.larc.nasa.gov/api/temporal/monthly/point` and `/api/temporal/monthly/climatology/point` |
| Parameter | `PRECTOTCORR` (precipitation, corrected), plus `T2M` if needed |
| Resolution | 0.5° × 0.5° grid |
| Coverage | Global, 1981 to near-present |
| Access | Free, no API key |
| Formats | JSON, CSV, NetCDF |
| Use | Monthly rainfall series for the water balance; climatology for annual normals |
| Caveat | Grid-cell value, not a station measurement. Must be labelled as gridded data, not observed at the site. |
| Citation | NASA POWER Project, NASA Langley Research Center. Record retrieval date and the exact request URL with each record. |

Example request shape:

```text
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=PRECTOTCORR
  &community=AG
  &longitude=75.85&latitude=22.72
  &start=1991&end=2020
  &format=JSON
```

### Cross-check (India, optional)

| Field | Value |
| --- | --- |
| Dataset | IMD gridded rainfall, or Open-Meteo ERA5 archive |
| Use | Sanity-check POWER values for Indian sites |
| Status | Not yet selected; see open questions |

---

## 3. Runoff coefficient

| Field | Value |
| --- | --- |
| Primary | CPWD, *Rain Water Harvesting* — Table 2, "Runoff Co-efficient of Various Surfaces", **p. 14** |
| URL | `https://www.cpwd.gov.in/Publication/rain_wh.pdf` |
| Transcribed ranges | Tiles **0.80–0.90**; corrugated metal sheets **0.70–0.90**; concrete **0.70–0.95**. The CPWD PDF text layer is imperfect; the ranges were cross-checked against the CSE reproduction below. |
| Cross-check | CSE India, *Technical Design of Rainwater Harvesting* (2016), slide "Runoff Coefficients and RWH potential" — reproduces the CPWD 2002 table |
| Cross-check URL | `https://cdn.cseindia.org/userfiles/Technical-Design-of-RWH.pdf` |
| Secondary | IS 15797:2008, *Roof Top Rainwater Harvesting — Guidelines*, **Clause 5.1, p. 2**: runoff coefficient range **0.8 to 0.95** |
| Secondary URL | `https://www.icid.org/rfwaterharvesting_guidelines.pdf` |
| Selected values | Tiles **0.85** (CPWD worked example; Table 2, p. 14 gives the range); concrete **0.85**; metal **0.90**; asbestos **0.80**; other **0.80** |
| Status | Tiles is `verified`. The other single values are `pending`: the range is verified, but the exact value is a RainWise selection that needs professional review. The reproduced CPWD rows show tiles, corrugated metal, and concrete; asbestos is not a separate reproduced row, so its value comes from IS 15797. |
| Use | Map roof material and condition to a coefficient in a versioned rule file |

The coefficient is stored per roof segment, never as a global default. The full selection discussion and the worked example are in `docs/ENGINEERING_METHODOLOGY.md` §3 and §4.

---

## 4. Soil

### Primary: SoilGrids 2.0

| Field | Value |
| --- | --- |
| Dataset | SoilGrids 2.0, ISRIC World Soil Information |
| API | `https://rest.isric.org/soilgrids/v2.0/properties/query` |
| Properties | `sand`, `silt`, `clay`, `bdod`, `cfvo`, `phh2o` |
| Resolution | 250 m, six depth intervals |
| Coverage | Global |
| Access | Free; fair-use limit of 5 requests per minute |
| Use | Soil texture class and a *context* value, not a substitute for an infiltration test |
| Caveat | The REST service has been in beta and has had downtime. Implement a cached fallback (WebDAV tiles or a stored snapshot) before relying on it in a demo. |

### Infiltration rate

**No global dataset is trustworthy enough to size a structure from.** Infiltration must come from a site test (soak pit or double-ring infiltrometer) with method, depth, and date recorded.

If the user has no test, the engine returns `INSUFFICIENT_DATA` for percolation-dependent sizing. A texture-based estimate may be offered only if it is explicitly labelled an estimate and the result is downgraded to `REVIEW_REQUIRED`. This is an open decision (see §8).

---

## 5. Groundwater

| Field | Value |
| --- | --- |
| Source | User observation: depth to water table, date, and how it was observed |
| India reference | CGWB / India-WRIS published water-level data, if a usable endpoint is confirmed |
| Coverage | Site-specific; no reliable free global API |
| Use | Hard constraint on structure depth, and a feasibility criterion |
| Rule | A structure must not extend below the local water table. CGWB FAQ (2025), PDF pp. 17–18 and 23: stop 3–5 m above the water level; avoid recharge where the post-monsoon water level is less than 3 m below ground. RainWise applies the minimum 3 m clearance and rejects a site below 3 m. |

If depth is unknown, any result that depends on it is `INSUFFICIENT_DATA`. The app must never assume a deep water table.

---

## 6. Recharge criteria and structure design

### Primary: CGWB Manual on Artificial Recharge of Ground Water (2007)

| Field | Value |
| --- | --- |
| Publisher | Central Ground Water Board, Ministry of Jal Shakti, Government of India |
| Year | 2007 |
| URL | `https://cgwa.mowr.gov.in/Documents/Manual-Artificial-Recharge.pdf` |
| Mirror | `https://cgwb.gov.in/sites/default/files/MainLinks/Manual-Artificial-Recharge.pdf` |
| Key content | **Table 5.3, pp. 48–50** — suitability of recharge structures by hydrogeological setting; **§6.2.3.3, pp. 91–92** — recharge pits and shafts; **§6.2.3.3.1.1, pp. 91–92** — pit site characteristics and design; **§6.2.3.3.2.1, p. 92** — shaft design guidelines |
| Use | The India rule pack: which structure suits which setting, and the design constraints |
| Not in the manual | The 15/10 mm/h infiltration thresholds, 4 m² space, 15% slope, 15 m setback, 1.5 safety factor, 50 mm/h design storm, 0.40 void ratios, and maximum depths are RainWise project assumptions. See `docs/ENGINEERING_METHODOLOGY.md` §8. |

### Supporting: CGWB Guide on Artificial Recharge to Ground Water (2005)

| Field | Value |
| --- | --- |
| URL | `https://cgwb.gov.in/cgwbpnm/public/uploads/documents/16861384061006484074file.pdf` |
| Use | Site-characteristic and design guidance for recharge shafts; cross-check for the 2007 manual |

### Status

Table 5.3 has been read and summarised in `docs/ENGINEERING_METHODOLOGY.md` §2.1. The app uses it as a qualitative cross-check, not as a row-by-row numerical lookup, because the app does not ask for a geological group. The numeric design defaults are labelled project assumptions and are not attributed to CGWB. If a row cannot be read unambiguously, it is not presented as a threshold.

---

## 7. Terrain and mapping

| Field | Value |
| --- | --- |
| Elevation / slope | Copernicus DEM GLO-30, or the Open-Meteo elevation API |
| Base map | OpenStreetMap raster tiles, attribution required (ODbL) |
| Satellite | Optional licensed provider; licence must be checked before deployment |
| Geocoding | Nominatim (respect the usage policy and cache results) or a licensed provider |
| Geometry storage | EPSG:4326; area computed in a projected CRS (UTM zone chosen from the site longitude) |

Slope from a DEM is labelled as terrain-derived and approximate. It is not a substitute for a site survey.

---

## 8. Open questions

| Question | Why it matters |
| --- | --- |
| Is an India rainfall cross-check required, or is NASA POWER alone acceptable? | Affects the credibility of every yield number |
| Do we allow a texture-based infiltration estimate at all? | It would weaken the "measured evidence" guarantee; must be labelled and downgraded |
| Which design storm (return period, duration) drives structure sizing? | Determines the recommended pit or trench volume |
| Which region packs ship first? | India is confirmed; others return `REVIEW_REQUIRED` |
| What is the map tile licence for the deployed demo? | OSM is fine for development; production needs a decision |

---

## 9. Rejected sources

| Source | Why rejected |
| --- | --- |
| AI-generated rainfall or climate values | Not traceable, not reproducible, and may be wrong |
| AI-generated runoff coefficients | Same; a citable table already exists |
| AI-generated feasibility thresholds | Would turn a decision-support tool into a guess |
| Generic "typical" tank sizes from blog posts | No provenance, no applicability conditions |
| Satellite imagery interpreted as subsurface evidence | The handoff explicitly forbids it |
