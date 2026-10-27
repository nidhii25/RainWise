"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Protected } from "@/lib/auth";
import { dateTime, litres, systemLabel } from "@/lib/format";
import type { AssessmentSummary } from "@/lib/types";

function History() {
  const [items, setItems] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listAllAssessments()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <span className="eyebrow">History</span>
          <h1>Every assessment</h1>
          <p>Runs are immutable snapshots. A new run never overwrites an old one.</p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">
          Back to properties
        </Link>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="card card-pad muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <h3>No assessments yet</h3>
          <p>Open a property and run your first assessment.</p>
          <Link href="/dashboard" className="btn btn-primary">
            Go to properties
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>System</th>
                <th>Recharge</th>
                <th className="num">Harvest</th>
                <th className="num">Tank</th>
                <th>Run at</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/assessments/${item.id}`}>{item.label}</Link>
                    <div className="tiny muted mono">{item.id.slice(0, 8)}</div>
                  </td>
                  <td>{systemLabel(item.system)}</td>
                  <td>
                    <StatusBadge status={item.recharge_status} />
                  </td>
                  <td className="num">{litres(item.annual_net_litres)}</td>
                  <td className="num">
                    {item.tank_usable_m3 ? `${item.tank_usable_m3.toFixed(1)} m³` : "—"}
                  </td>
                  <td className="small muted">{dateTime(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AppShell>
      <Protected>
        <History />
      </Protected>
    </AppShell>
  );
}
