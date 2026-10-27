"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Protected } from "@/lib/auth";
import {
  dateTime,
  dimensionText,
  litres,
  number,
  percent,
  statusLabel,
  systemLabel,
} from "@/lib/format";
import type { AiConceptResponse, AssessmentDetail, CriterionEvaluation } from "@/lib/types";

const StructureViewer = dynamic(
  () => import("@/components/StructureViewer").then((module) => module.StructureViewer),
  {
    ssr: false,
    loading: () => <div className="viewer center">Loading 3D view…</div>,
  },
);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CRITERION_ICON: Record<string, string> = {
  pass: "✓",
  fail: "✕",
  unknown: "?",
  review: "!",
};

function CriteriaList({ criteria }: { criteria: CriterionEvaluation[] }) {
  return (
    <div className="criteria">
      {criteria.map((criterion) => (
        <div key={criterion.id} className={`criterion criterion-${criterion.result}`}>
          <span className="criterion-icon">{CRITERION_ICON[criterion.result] ?? "?"}</span>
          <div>
            <div className="name">{criterion.label}</div>
            <div className="detail">
              {criterion.value === null ? (
                "Not provided"
              ) : (
                <>
                  {number(criterion.value, 2)}
                  {criterion.unit ? ` ${criterion.unit}` : ""}
                </>
              )}
              {criterion.threshold ? ` · needs ${criterion.threshold}` : ""}
              {criterion.note ? ` · ${criterion.note}` : ""}
            </div>
            {criterion.source ? (
              <div className="detail">
                Source: {criterion.source.title}
                {criterion.source.locator ? `, ${criterion.source.locator}` : ""}
              </div>
            ) : null}
          </div>
          <span className="value">{criterion.result}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ monthly, demandMonthly }: { monthly: number[]; demandMonthly: number }) {
  const max = Math.max(...monthly, demandMonthly, 0.01);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: 150,
          paddingTop: 8,
        }}
      >
        {monthly.map((value, index) => (
          <div
            key={MONTHS[index]}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
              gap: 5,
            }}
            title={`${MONTHS[index]}: ${number(value, 1)} m³`}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(2, (value / max) * 100)}%`,
                background: value >= demandMonthly ? "var(--green)" : "var(--mint-strong)",
                borderRadius: 4,
              }}
            />
            <span className="tiny muted">{MONTHS[index]}</span>
          </div>
        ))}
      </div>
      <div className="between tiny muted mt-2">
        <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                background: "var(--green)",
                borderRadius: 2,
                marginRight: 6,
              }}
            />
            Meets demand
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                background: "var(--mint-strong)",
                borderRadius: 2,
                marginRight: 6,
              }}
            />
            Below demand
          </span>
        </span>
        <span>Demand {number(demandMonthly, 1)} m³/month</span>
      </div>
    </div>
  );
}

function Detail() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [error, setError] = useState("");
  const [concept, setConcept] = useState<AiConceptResponse | null>(null);
  const [conceptBusy, setConceptBusy] = useState(false);
  const [conceptError, setConceptError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getAssessment(params.id)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the assessment.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function generateConcept() {
    if (!data) return;
    setConceptBusy(true);
    setConceptError("");
    try {
      const response = await api.conceptVisual({
        system: data.result.system,
        tank_label: data.result.storage.recommended?.label ?? null,
        structure_type: data.result.structure?.type ?? null,
        notes: data.result.notes,
      });
      setConcept(response);
    } catch (caught) {
      setConceptError(caught instanceof Error ? caught.message : "Could not generate the concept.");
    } finally {
      setConceptBusy(false);
    }
  }

  if (error) {
    return (
      <div className="container">
        <div className="form-error">{error}</div>
        <Link href="/dashboard" className="btn btn-ghost mt-3">
          Back to properties
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container">
        <div className="card card-pad muted">Loading assessment…</div>
      </div>
    );
  }

  const { result, input } = data;
  const tank = result.storage.recommended;
  const structure = result.structure;
  const coverage = result.coverage;
  const demandMonthly = result.storage.demand_m3 / 12;
  const monthly = result.rooftop.monthly_net_m3;

  const systemNotes: Record<string, string> = {
    storage_only: "A storage tank is sized for the target reliability. Overflow can go to a drain or a soak pit.",
    storage_and_recharge:
      "Storage covers part of demand; the overflow is routed to a recharge structure sized for the design storm.",
    recharge_only:
      "No tank was sized from the data, but the site passes the recharge criteria. Runoff goes to recharge.",
    none:
      "Neither a tank nor a recharge structure could be sized from the data. Review the missing inputs below.",
  };

  return (
    <div className="container">
      <div className="breadcrumb no-print">
        <Link href="/dashboard">Properties</Link>
        <span>/</span>
        <Link href={`/properties/${data.property_id}`}>Property</Link>
        <span>/</span>
        <span>{data.label}</span>
      </div>

      <div className="page-head">
        <div>
          <span className="eyebrow">Assessment result</span>
          <h1>{data.label}</h1>
          <p>
            Run {dateTime(data.created_at)} · engine {data.method_version}
          </p>
        </div>
        <div className="row no-print">
          <Link href={`/properties/${data.property_id}`} className="btn btn-ghost">
            Property
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            Print / save PDF
          </button>
          <Link
            href={`/properties/${data.property_id}/assessments/new`}
            className="btn btn-primary"
          >
            Run another
          </Link>
        </div>
      </div>

      <div className="card card-pad" style={{ borderLeft: "4px solid var(--green)" }}>
        <div className="between">
          <div>
            <span className="eyebrow">Recommended system</span>
            <h2 className="mt-0">{systemLabel(result.system)}</h2>
            <p className="muted mt-2">{systemNotes[result.system] ?? ""}</p>
          </div>
          <StatusBadge status={result.recharge.status} />
        </div>
      </div>

      <div className="grid grid-4 mt-3">
        <div className="metric">
          <div className="metric-label">Harvestable</div>
          <div className="metric-value">
            {litres(coverage.annual_net_litres ?? 0)}
          </div>
          <div className="metric-sub">Net collectible per year</div>
        </div>
        <div className="metric">
          <div className="metric-label">Storage</div>
          <div className="metric-value">
            {tank ? (
              <>
                {number(tank.usable_m3, 1)} <small>m³ usable</small>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="metric-sub">{tank?.label ?? "Not sized"}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Demand met</div>
          <div className="metric-value">
            {tank?.reliability !== null && tank?.reliability !== undefined
              ? percent(tank.reliability)
              : "—"}
          </div>
          <div className="metric-sub">
            Target {percent(result.storage.target_reliability)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Recharge</div>
          <div className="metric-value">
            {structure ? percent(structure.fraction_handled) : statusLabel(result.recharge.status)}
          </div>
          <div className="metric-sub">
            {structure ? `${structure.type} · design storm` : "No structure sized"}
          </div>
        </div>
      </div>

      <div className="split mt-3">
        <div className="stack">
          <section className="card card-pad">
            <div className="card-header">
              <div>
                <h2>The design</h2>
                <p>Exact sizes for the recommended components.</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="metric">
                <div className="metric-label">Storage tank</div>
                {tank ? (
                  <>
                    <div className="metric-value" style={{ fontSize: "1.25rem" }}>
                      {tank.label}
                    </div>
                    <div className="metric-sub">
                      {dimensionText(tank.dimensions)} · {tank.material}
                    </div>
                    <div className="small mt-2">
                      <div className="between">
                        <span className="muted">Gross volume</span>
                        <span>{number(tank.gross_m3, 2)} m³</span>
                      </div>
                      <div className="between">
                        <span className="muted">Usable volume</span>
                        <span>{number(tank.usable_m3, 2)} m³</span>
                      </div>
                      <div className="between">
                        <span className="muted">Reliability</span>
                        <span>{percent(tank.reliability ?? 0)}</span>
                      </div>
                      <div className="between">
                        <span className="muted">Overflow</span>
                        <span>{litres((tank.overflow_m3 ?? 0) * 1000)}</span>
                      </div>
                      <div className="between">
                        <span className="muted">Months empty</span>
                        <span>{tank.months_empty ?? 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="small muted mt-2">
                    No tank could be sized. A monthly rainfall series is required.
                  </p>
                )}
              </div>

              <div className="metric">
                <div className="metric-label">Recharge structure</div>
                {structure ? (
                  <>
                    <div className="metric-value" style={{ fontSize: "1.25rem", textTransform: "capitalize" }}>
                      {structure.type}
                    </div>
                    <div className="metric-sub">{dimensionText(structure.dimensions)}</div>
                    <div className="small mt-2">
                      <div className="between">
                        <span className="muted">Working volume</span>
                        <span>{number(structure.working_volume_m3, 2)} m³</span>
                      </div>
                      <div className="between">
                        <span className="muted">Design storm</span>
                        <span>{number(structure.design_volume_m3, 2)} m³</span>
                      </div>
                      <div className="between">
                        <span className="muted">Percolation</span>
                        <span>{number(structure.percolation_m3_per_hr, 2)} m³/h</span>
                      </div>
                      <div className="between">
                        <span className="muted">Design storm handled</span>
                        <span>{percent(structure.fraction_handled)}</span>
                      </div>
                      <div className="between">
                        <span className="muted">Clearance to water table</span>
                        <span>{number(structure.clearance_above_water_table_m, 1)} m</span>
                      </div>
                    </div>
                    {structure.media_layers.length > 0 ? (
                      <div className="small muted mt-2" style={{ overflowWrap: "anywhere" }}>
                        Media: {structure.media_layers.map((layer) => `${layer.material}${layer.thickness_mm > 0 ? ` (${layer.thickness_mm} mm)` : ""}`).join(" → ")}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="small muted mt-2">
                    {result.recharge.status === "NOT_ELIGIBLE"
                      ? "The site does not meet the recharge criteria."
                      : "Recharge was not sized. See the criteria below."}
                  </p>
                )}
              </div>
            </div>

            {result.notes.length > 0 ? (
              <ul className="small muted mt-3">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card card-pad">
            <div className="card-header">
              <div>
                <h2>3D layout</h2>
                <p>Parametric model from the stored dimensions. Rotate to inspect.</p>
              </div>
            </div>
            <StructureViewer result={result} input={input} />
          </section>

          {monthly ? (
            <section className="card card-pad">
              <div className="card-header">
                <div>
                  <h2>Monthly water balance</h2>
                  <p>Net inflow after first flush and filter loss, by month.</p>
                </div>
              </div>
              <MonthlyChart monthly={monthly} demandMonthly={demandMonthly} />
            </section>
          ) : null}

          <section className="card card-pad">
            <div className="card-header">
              <div>
                <h2>Recharge decision</h2>
                <p>
                  Every criterion is evaluated separately. A blank input is never treated
                  as a pass.
                </p>
              </div>
              <StatusBadge status={result.recharge.status} />
            </div>

            <CriteriaList criteria={result.recharge.criteria} />

            {result.recharge.reasons.length > 0 ? (
              <ul className="small muted mt-3">
                {result.recharge.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card card-pad">
            <div className="card-header">
              <div>
                <h2>Piping schedule</h2>
                <p>Sizes and estimated lengths from the roof geometry.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>From → to</th>
                    <th className="num">Diameter</th>
                    <th className="num">Length</th>
                    <th>Slope</th>
                  </tr>
                </thead>
                <tbody>
                  {result.piping.map((line) => (
                    <tr key={line.id}>
                      <td className="mono">{line.id}</td>
                      <td>
                        {line.from_point} → {line.to_point}
                        <div className="tiny muted">{line.purpose}</div>
                      </td>
                      <td className="num">{line.diameter_mm} mm</td>
                      <td className="num">{number(line.length_m, 1)} m</td>
                      <td>{line.slope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <div className="card-header">
              <div>
                <h2>Quantities</h2>
                <p>Approximate. No costs are included.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Quantity</th>
                    <th>Unit</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {result.quantities.map((item) => (
                    <tr key={item.item}>
                      <td>{item.item}</td>
                      <td className="num">{number(item.quantity, 2)}</td>
                      <td>{item.unit}</td>
                      <td className="small muted">{item.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="card card-pad">
            <h2>Inputs</h2>
            <div className="small mt-2">
              <div className="between">
                <span className="muted">Roof area</span>
                <span>{number(result.rooftop.area_m2, 1)} m²</span>
              </div>
              <div className="between">
                <span className="muted">Rainfall</span>
                <span>{number(input.rainfall.annual_mm, 0)} mm/yr</span>
              </div>
              <div className="between">
                <span className="muted">Recharge rule pack</span>
                <span>
                  {input.region && input.region.toLowerCase() !== "in"
                    ? `${input.region.toUpperCase()} — no rule pack`
                    : "India — CGWB 2007"}
                </span>
              </div>
              <div className="between">
                <span className="muted">Demand</span>
                <span>
                  {number(input.demand.people, 0)} × {number(input.demand.litres_per_person_per_day, 0)} L/day
                </span>
              </div>
              <div className="between">
                <span className="muted">First flush</span>
                <span>{number(result.rooftop.first_flush_m3, 2)} m³</span>
              </div>
              <div className="between">
                <span className="muted">Filter loss</span>
                <span>{number(result.rooftop.filter_loss_m3, 2)} m³</span>
              </div>
              <div className="between">
                <span className="muted">Infiltration</span>
                <span>
                  {input.site.infiltration_mm_per_hr !== null && input.site.infiltration_mm_per_hr !== undefined
                    ? `${number(input.site.infiltration_mm_per_hr, 1)} mm/h`
                    : "Not provided"}
                </span>
              </div>
              <div className="between">
                <span className="muted">Water table</span>
                <span>
                  {input.site.water_table_depth_m !== null && input.site.water_table_depth_m !== undefined
                    ? `${number(input.site.water_table_depth_m, 1)} m`
                    : "Not provided"}
                </span>
              </div>
              <div className="between">
                <span className="muted">Contamination setback</span>
                <span>
                  {input.site.contamination_distance_m !== null && input.site.contamination_distance_m !== undefined
                    ? `${number(input.site.contamination_distance_m, 1)} m`
                    : "Not provided"}
                </span>
              </div>
              <div className="between">
                <span className="muted">Free space</span>
                <span>
                  {input.site.available_space_m2 !== null && input.site.available_space_m2 !== undefined
                    ? `${number(input.site.available_space_m2, 1)} m²`
                    : "Not provided"}
                </span>
              </div>
              <div className="between">
                <span className="muted">Slope</span>
                <span>
                  {input.site.slope_pct !== null && input.site.slope_pct !== undefined
                    ? `${number(input.site.slope_pct, 1)}%`
                    : "Not provided"}
                </span>
              </div>
            </div>
          </section>

          {result.warnings.length > 0 ? (
            <section className="card card-pad">
              <h2>Warnings</h2>
              <div className="stack-sm mt-2">
                {result.warnings.map((warning) => (
                  <div
                    key={warning.code + warning.message}
                    className={`notice ${
                      warning.severity === "error"
                        ? "notice-error"
                        : warning.severity === "info"
                          ? "notice-info"
                          : "notice-warn"
                    }`}
                  >
                    <span>{warning.severity === "info" ? "i" : "!"}</span>
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card card-pad">
            <h2>AI concept image</h2>
            <p className="small muted mt-2">
              An illustrative render, not a construction drawing. It never changes a
              dimension.
            </p>

            {concept?.image_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={concept.image_data_url}
                alt="AI concept render of the recommended system"
                style={{ width: "100%", borderRadius: 10, marginTop: 12 }}
              />
            ) : null}

            {concept && !concept.image_data_url ? (
              <div className="notice notice-info mt-2">
                <span>i</span>
                <span>{concept.message}</span>
              </div>
            ) : null}

            {conceptError ? <div className="form-error mt-2">{conceptError}</div> : null}

            <button
              type="button"
              className="btn btn-ghost btn-block mt-2 no-print"
              onClick={generateConcept}
              disabled={conceptBusy}
            >
              {conceptBusy ? <span className="spin" /> : null}
              {conceptBusy ? "Generating…" : "Generate concept image"}
            </button>
            {concept?.narrative ? (
              <p className="small muted mt-2">{concept.narrative}</p>
            ) : null}
          </section>

          <section className="card card-pad">
            <h2>Sources</h2>
            <ul className="small muted mt-2">
              {result.sources.map((source) => (
                <li key={source.key}>
                  <strong>{source.title}</strong>
                  <div className="tiny">
                    {source.publisher}
                    {source.year ? `, ${source.year}` : ""}
                    {source.locator ? ` · ${source.locator}` : ""}
                  </div>
                  {source.url ? (
                    <a className="tiny" href={source.url} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Disclaimer />
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <AppShell>
      <Protected>
        <Detail />
      </Protected>
    </AppShell>
  );
}
