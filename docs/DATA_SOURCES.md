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
| Primary | CPWD, *Rain Water Harvesting* — Table 2, "Runoff Co-efficient of Various Surfaces" |
| URL | `https://www.cpwd.gov.in/Publication/rain_wh.pdf` |
| Verified value | Tiles = 0.85 (Table 2) |
| Secondary | IS 15797:2008, *Roof Top Rainwater Harvesting — Guidelines*, states a runoff coefficient range of 0.8 to 0.95 |
| URL | `https://www.icid.org/rfwaterharvesting_guidelines.pdf` |
| Use | Map roof material and condition to a coefficient in a versioned rule file |
| Action required | Transcribe the full Table 2 into `rules/coefficients/roof.yaml` with a page reference per row |

The coefficient is stored per roof segment, never as a global default.

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
| Rule | A structure must not extend below the local water table. CGWB guidance: stop 3–5 m above the water level. |

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
| Key content | Table 5.3 — suitability of recharge structures by hydrogeological setting; §6.2.3.3 — recharge pits and shafts; chapter 6 — site selection and design guidelines per structure |
| Use | The India rule pack: which structure suits which setting, and the design constraints |

### Supporting: CGWB Guide on Artificial Recharge to Ground Water (2005)

| Field | Value |
| --- | --- |
| URL | `https://cgwb.gov.in/cgwbpnm/public/uploads/documents/16861384061006484074file.pdf` |
| Use | Site-characteristic and design guidance for recharge shafts; cross-check for the 2007 manual |

### Action required

Transcribe Table 5.3 into `rules/in/cgwb-2007.yaml` row by row, with the table and page number on every row. Do not paraphrase a threshold. If a row cannot be read unambiguously, it does not go into the file.

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
