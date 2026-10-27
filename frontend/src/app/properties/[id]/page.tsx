"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { SiteMap } from "@/components/SiteMap";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Protected } from "@/lib/auth";
import { dateTime, litres, systemLabel } from "@/lib/format";
import type { AssessmentSummary, Property } from "@/lib/types";

function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [loadedProperty, loadedAssessments] = await Promise.all([
          api.getProperty(propertyId),
          api.listAssessments(propertyId),
        ]);
        if (!cancelled) {
          setProperty(loadedProperty);
          setAssessments(loadedAssessments);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load the property.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function archive() {
    if (!property) return;
    if (!window.confirm(`Archive “${property.name}”? Assessments stay in your history.`)) {
      return;
    }
    setArchiving(true);
    try {
      await api.archiveProperty(property.id);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not archive the property.");
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card card-pad muted">Loading property…</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container">
        <div className="form-error">{error || "Property not found."}</div>
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
        <span>{property.name}</span>
      </div>

      <div className="page-head">
        <div>
          <h1>{property.name}</h1>
          <p>{property.address || "No address recorded"}</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={archive} disabled={archiving}>
            {archiving ? "Archiving…" : "Archive"}
          </button>
          <Link
            href={`/properties/${property.id}/assessments/new`}
            className="btn btn-primary"
          >
            New assessment
          </Link>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {property.is_archived ? (
        <div className="notice notice-warn">
          <span>!</span>
          <span>This property is archived. Existing assessments remain readable.</span>
        </div>
      ) : null}

      <div className="split mt-3">
        <section>
          <div className="between">
            <h2>Assessment history</h2>
            <span className="small muted">{assessments.length} run(s)</span>
          </div>

          {assessments.length === 0 ? (
            <div className="empty mt-2">
              <h3>No assessments yet</h3>
              <p>
                Enter the roof, rainfall, demand, and site conditions. The engine returns
                a tank, a recharge verdict, piping, and quantities.
              </p>
              <Link
                href={`/properties/${property.id}/assessments/new`}
                className="btn btn-primary"
              >
                Start an assessment
              </Link>
            </div>
          ) : (
            <div className="list mt-2">
              {assessments.map((item) => (
                <Link key={item.id} href={`/assessments/${item.id}`} className="list-item">
                  <div>
                    <div className="title">{item.label}</div>
                    <div className="meta">
                      {systemLabel(item.system)} · {litres(item.annual_net_litres)}
                      {item.tank_usable_m3
                        ? ` · ${item.tank_usable_m3.toFixed(1)} m³ tank`
                        : ""}
                    </div>
                    <div className="meta">{dateTime(item.created_at)}</div>
                  </div>
                  <StatusBadge status={item.recharge_status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="stack">
          <div className="card card-pad">
            <h2>Location</h2>
            {property.latitude !== null && property.longitude !== null ? (
              <div className="mt-2">
                <SiteMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  label={property.name}
                />
              </div>
            ) : (
              <p className="small muted mt-2">
                No coordinates recorded. Add latitude and longitude to see the site on a
                map. This is optional and is not used in the calculations.
              </p>
            )}
          </div>

          <div className="card card-pad">
            <h2>Property details</h2>
            <div className="stack-sm mt-2 small">
              <div className="between">
                <span className="muted">Created</span>
                <span>{dateTime(property.created_at)}</span>
              </div>
              <div className="between">
                <span className="muted">Last updated</span>
                <span>{dateTime(property.updated_at)}</span>
              </div>
              <div className="between">
                <span className="muted">Status</span>
                <span>{property.is_archived ? "Archived" : "Active"}</span>
              </div>
            </div>
            {property.notes ? <p className="small muted mt-2">{property.notes}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function PropertyPage() {
  return (
    <AppShell>
      <Protected>
        <PropertyDetail />
      </Protected>
    </AppShell>
  );
}
