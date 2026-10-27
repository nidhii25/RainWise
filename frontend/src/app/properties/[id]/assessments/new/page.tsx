"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { Protected } from "@/lib/auth";
import type { AssessmentInputPayload, Property } from "@/lib/types";

interface SegmentDraft {
  label: string;
  area: string;
  material: string;
  coefficient: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MATERIALS = [
  { value: "tiles", label: "Tiles" },
  { value: "concrete", label: "Concrete / RCC" },
  { value: "metal", label: "Metal / GI sheet" },
  { value: "asbestos", label: "Asbestos sheet" },
  { value: "other", label: "Other / unknown" },
];

function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function AssessmentForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [loadError, setLoadError] = useState("");

  const [label, setLabel] = useState("");
  const [segments, setSegments] = useState<SegmentDraft[]>([
    { label: "Main roof", area: "", material: "tiles", coefficient: "" },
  ]);

  const [annual, setAnnual] = useState("900");
  const [useMonthly, setUseMonthly] = useState(false);
  const [monthly, setMonthly] = useState<string[]>(Array(12).fill(""));

  const [people, setPeople] = useState("4");
  const [lpcd, setLpcd] = useState("100");

  const [infiltration, setInfiltration] = useState("");
  const [waterTable, setWaterTable] = useState("");
  const [contamination, setContamination] = useState("");
  const [space, setSpace] = useState("");
  const [slope, setSlope] = useState("");

  const [buildingHeight, setBuildingHeight] = useState("6");
  const [tankDistance, setTankDistance] = useState("5");
  const [rechargeDistance, setRechargeDistance] = useState("3");
  const [eaveLength, setEaveLength] = useState("");

  const [target, setTarget] = useState("0.8");
  const [region, setRegion] = useState("in");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getProperty(propertyId)
      .then((loaded) => {
        if (cancelled) return;
        setProperty(loaded);
        if (!label) {
          setLabel(`Assessment ${new Date().toLocaleDateString("en-IN")}`);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : "Could not load the property.");
        }
      });
    return () => {
      cancelled = true;
    };
    // Label is intentionally read once for the default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  function updateSegment(index: number, patch: Partial<SegmentDraft>) {
    setSegments((current) =>
      current.map((segment, position) => (position === index ? { ...segment, ...patch } : segment)),
    );
  }

  function addSegment() {
    setSegments((current) => [
      ...current,
      { label: `Roof ${current.length + 1}`, area: "", material: "tiles", coefficient: "" },
    ]);
  }

  function removeSegment(index: number) {
    setSegments((current) => current.filter((_, position) => position !== index));
  }

  const monthlyTotal = monthly.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const annualMm = useMonthly ? monthlyTotal : Number(annual) || 0;

  const segmentsValid = segments.every(
    (segment) => Number(segment.area) > 0 && segment.label.trim().length > 0,
  );
  const monthlyValid =
    !useMonthly ||
    monthly.every((value) => value.trim() !== "" && Number(value) >= 0 && Number(value) < 2000);
  const canSubmit = Boolean(property) && segmentsValid && monthlyValid && annualMm > 0 && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!property) return;
    if (!segmentsValid) {
      setError("Every roof segment needs a name and an area greater than zero.");
      return;
    }
    if (!monthlyValid) {
      setError("Enter all 12 monthly rainfall values, or switch monthly input off.");
      return;
    }

    const payload: AssessmentInputPayload = {
      segments: segments.map((segment) => ({
        label: segment.label.trim(),
        area_m2: Number(segment.area),
        material: segment.material,
        runoff_coefficient: optionalNumber(segment.coefficient),
        area_method: "measured",
      })),
      rainfall: {
        annual_mm: annualMm,
        monthly_mm: useMonthly ? monthly.map((value) => Number(value)) : null,
        source: "user",
        period: useMonthly ? "monthly" : "annual",
      },
      demand: {
        people: Math.max(1, Number(people) || 1),
        litres_per_person_per_day: Math.max(1, Number(lpcd) || 100),
      },
      site: {
        infiltration_mm_per_hr: optionalNumber(infiltration),
        water_table_depth_m: optionalNumber(waterTable),
        contamination_distance_m: optionalNumber(contamination),
        available_space_m2: optionalNumber(space),
        slope_pct: optionalNumber(slope),
      },
      geometry: {
        building_height_m: Math.max(1, Number(buildingHeight) || 6),
        tank_distance_m: Math.max(0, Number(tankDistance) || 0),
        recharge_distance_m: Math.max(0, Number(rechargeDistance) || 0),
        eave_length_m: optionalNumber(eaveLength),
      },
      target_reliability: Number(target),
      region,
    };

    setBusy(true);
    try {
      const created = await api.createAssessment(
        property.id,
        label.trim() || "Assessment",
        payload,
      );
      router.push(`/assessments/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the assessment.");
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="container">
        <div className="form-error">{loadError}</div>
        <Link href="/dashboard" className="btn btn-ghost mt-3">
          Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link href="/dashboard">Properties</Link>
        <span>/</span>
        <Link href={`/properties/${propertyId}`}>{property?.name ?? "Property"}</Link>
        <span>/</span>
        <span>New assessment</span>
      </div>

      <div className="page-head">
        <div>
          <h1>New assessment</h1>
          <p>
            Enter what you measured. Leave a field blank if you do not know it — the
            result will say what is missing instead of guessing.
          </p>
        </div>
      </div>

      {property?.is_archived ? (
        <div className="notice notice-warn">
          <span>!</span>
          <span>This property is archived. New assessments are disabled.</span>
        </div>
      ) : null}

      <form onSubmit={submit} className="stack mt-3">
        {error ? <div className="form-error">{error}</div> : null}

        <fieldset>
          <legend>Run</legend>
          <div className="form-grid">
            <Field label="Assessment label" htmlFor="label" help="Used in your history.">
              <input
                id="label"
                className="input"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Baseline, after extension…"
              />
            </Field>
            <Field
              label="Reliability target"
              htmlFor="target"
              help="Share of monthly demand the tank should meet."
            >
              <select
                id="target"
                className="select"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.8">80% (recommended)</option>
                <option value="0.9">90%</option>
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend>Roof</legend>
          <p className="small muted">
            Add each roof surface separately. The runoff coefficient comes from the
            material table; override it only if you have a measured value.
          </p>

          <div className="stack-sm mt-2">
            {segments.map((segment, index) => (
              <div key={index} className="segment-row">
                <Field label={`Segment ${index + 1}`} htmlFor={`segment-label-${index}`}>
                  <input
                    id={`segment-label-${index}`}
                    className="input"
                    value={segment.label}
                    onChange={(event) => updateSegment(index, { label: event.target.value })}
                  />
                </Field>
                <Field label="Area (m²)" htmlFor={`segment-area-${index}`}>
                  <input
                    id={`segment-area-${index}`}
                    className="input"
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={segment.area}
                    onChange={(event) => updateSegment(index, { area: event.target.value })}
                  />
                </Field>
                <Field label="Material" htmlFor={`segment-material-${index}`}>
                  <select
                    id={`segment-material-${index}`}
                    className="select"
                    value={segment.material}
                    onChange={(event) => updateSegment(index, { material: event.target.value })}
                  >
                    {MATERIALS.map((material) => (
                      <option key={material.value} value={material.value}>
                        {material.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Coefficient"
                  htmlFor={`segment-c-${index}`}
                  help="Optional"
                >
                  <input
                    id={`segment-c-${index}`}
                    className="input"
                    type="number"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={segment.coefficient}
                    onChange={(event) =>
                      updateSegment(index, { coefficient: event.target.value })
                    }
                    placeholder="auto"
                  />
                </Field>
                <button
                  type="button"
                  className="icon-btn"
                  title="Remove segment"
                  aria-label="Remove segment"
                  onClick={() => removeSegment(index)}
                  disabled={segments.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={addSegment}>
            + Add roof segment
          </button>
        </fieldset>

        <fieldset>
          <legend>Rainfall</legend>
          <label className="check mt-0">
            <input
              type="checkbox"
              checked={useMonthly}
              onChange={(event) => setUseMonthly(event.target.checked)}
            />
            <span>
              I have a monthly rainfall series. Tank sizing needs 12 monthly values;
              annual-only input reports yield without a tank recommendation.
            </span>
          </label>

          {useMonthly ? (
            <div className="mt-3">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {MONTHS.map((month, index) => (
                  <Field key={month} label={month} htmlFor={`month-${index}`}>
                    <input
                      id={`month-${index}`}
                      className="input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={monthly[index]}
                      onChange={(event) =>
                        setMonthly((current) =>
                          current.map((value, position) =>
                            position === index ? event.target.value : value,
                          ),
                        )
                      }
                      placeholder="mm"
                    />
                  </Field>
                ))}
              </div>
              <p className="small muted mt-2">
                Annual total: <strong>{monthlyTotal.toFixed(0)} mm</strong>
              </p>
            </div>
          ) : (
            <div className="form-grid mt-3">
              <Field
                label="Annual rainfall (mm)"
                htmlFor="annual"
                help="Use a local long-term average."
              >
                <input
                  id="annual"
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={annual}
                  onChange={(event) => setAnnual(event.target.value)}
                />
              </Field>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Demand</legend>
          <div className="form-grid">
            <Field label="People" htmlFor="people">
              <input
                id="people"
                className="input"
                type="number"
                min="1"
                step="1"
                value={people}
                onChange={(event) => setPeople(event.target.value)}
              />
            </Field>
            <Field label="Litres per person per day" htmlFor="lpcd">
              <input
                id="lpcd"
                className="input"
                type="number"
                min="1"
                step="1"
                value={lpcd}
                onChange={(event) => setLpcd(event.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend>Recharge rule pack</legend>
          <Field
            label="Region"
            htmlFor="region"
            help="Only India has a rule pack in this build. Other regions return review required; yield and tank sizing still work."
          >
            <select
              id="region"
              className="input"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="in">India — CGWB 2007</option>
              <option value="other">Other — no rule pack (review required)</option>
            </select>
          </Field>
        </fieldset>

        <fieldset>
          <legend>Site conditions</legend>
          <p className="small muted">
            These decide recharge eligibility. If you have not measured them, leave them
            blank and the result will say which inputs are missing.
          </p>
          <div className="form-grid mt-2">
            <Field
              label="Infiltration rate (mm/h)"
              htmlFor="infiltration"
              help="Soak-pit or double-ring infiltrometer test."
            >
              <input
                id="infiltration"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={infiltration}
                onChange={(event) => setInfiltration(event.target.value)}
                placeholder="e.g. 25"
              />
            </Field>
            <Field
              label="Depth to water table (m)"
              htmlFor="water-table"
              help="Observed depth, with the date if possible."
            >
              <input
                id="water-table"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={waterTable}
                onChange={(event) => setWaterTable(event.target.value)}
                placeholder="e.g. 12"
              />
            </Field>
            <Field
              label="Distance to contamination (m)"
              htmlFor="contamination"
              help="Nearest septic tank, soak pit, drain, or landfill."
            >
              <input
                id="contamination"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={contamination}
                onChange={(event) => setContamination(event.target.value)}
                placeholder="e.g. 30"
              />
            </Field>
            <Field
              label="Free space for recharge (m²)"
              htmlFor="space"
              help="Unpaved area available for a pit or trench."
            >
              <input
                id="space"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={space}
                onChange={(event) => setSpace(event.target.value)}
                placeholder="e.g. 20"
              />
            </Field>
            <Field
              label="Ground slope (%)"
              htmlFor="slope"
              help="Rise over run, in percent."
            >
              <input
                id="slope"
                className="input"
                type="number"
                step="0.1"
                value={slope}
                onChange={(event) => setSlope(event.target.value)}
                placeholder="e.g. 2"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend>Pipe runs</legend>
          <p className="small muted">
            Used to estimate pipe lengths. Defaults are typical values; change them if you
            measured the site.
          </p>
          <div className="form-grid mt-2">
            <Field label="Building height (m)" htmlFor="building-height">
              <input
                id="building-height"
                className="input"
                type="number"
                min="1"
                step="0.1"
                value={buildingHeight}
                onChange={(event) => setBuildingHeight(event.target.value)}
              />
            </Field>
            <Field label="Roof edge to tank (m)" htmlFor="tank-distance">
              <input
                id="tank-distance"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={tankDistance}
                onChange={(event) => setTankDistance(event.target.value)}
              />
            </Field>
            <Field label="Tank to recharge (m)" htmlFor="recharge-distance">
              <input
                id="recharge-distance"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={rechargeDistance}
                onChange={(event) => setRechargeDistance(event.target.value)}
              />
            </Field>
            <Field
              label="Eave length (m)"
              htmlFor="eave-length"
              help="Optional. Defaults to two sides of a square roof."
            >
              <input
                id="eave-length"
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={eaveLength}
                onChange={(event) => setEaveLength(event.target.value)}
                placeholder="auto"
              />
            </Field>
          </div>
        </fieldset>

        <div className="between card card-pad">
          <div>
            <div className="title">Ready to run</div>
            <p className="small muted">
              Annual rainfall: {annualMm.toFixed(0)} mm · Roof area:{" "}
              {segments.reduce((sum, segment) => sum + (Number(segment.area) || 0), 0).toFixed(0)} m²
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {busy ? <span className="spin" /> : null}
            {busy ? "Calculating…" : "Run assessment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAssessmentPage() {
  return (
    <AppShell>
      <Protected>
        <AssessmentForm />
      </Protected>
    </AppShell>
  );
}
