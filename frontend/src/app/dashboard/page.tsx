"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Protected, useAuth } from "@/lib/auth";
import { dateTime, litres, systemLabel } from "@/lib/format";
import type { AssessmentSummary, Property } from "@/lib/types";

function Dashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [propertyList, assessmentList] = await Promise.all([
          api.listProperties(),
          api.listAllAssessments(),
        ]);
        if (!cancelled) {
          setProperties(propertyList);
          setAssessments(assessmentList);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load your data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createProperty(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const created = await api.createProperty({
        name: name.trim(),
        address: address.trim(),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });
      setProperties((current) => [created, ...current]);
      setName("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setShowForm(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not create the property.");
    } finally {
      setBusy(false);
    }
  }

  const counts = new Map<string, number>();
  for (const item of assessments) {
    counts.set(item.property_id, (counts.get(item.property_id) ?? 0) + 1);
  }

  const totalLitres = assessments.reduce((sum, item) => sum + item.annual_net_litres, 0);
  const firstName = (user?.full_name || user?.email || "").split(/[@\s]/)[0];

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Your workspace</span>
          <h1>{firstName ? `Hello, ${firstName}.` : "Your properties"}</h1>
          <p>Add a property, enter its roof, and run an assessment. History is kept.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add property"}
        </button>
      </div>

      {error ? <div className="form-error mt-2">{error}</div> : null}

      {showForm ? (
        <form onSubmit={createProperty} className="card card-pad mt-2">
          <div className="card-header">
            <div>
              <h2>New property</h2>
              <p>Only a name is required. Coordinates enable the map and are optional.</p>
            </div>
          </div>
          {formError ? <div className="form-error mt-2">{formError}</div> : null}
          <div className="form-grid mt-2">
            <Field label="Property name" htmlFor="property-name">
              <input
                id="property-name"
                className="input"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Home, Pune"
              />
            </Field>
            <Field label="Address" htmlFor="property-address" help="Optional">
              <input
                id="property-address"
                className="input"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Street, city, state"
              />
            </Field>
            <Field label="Latitude" htmlFor="latitude" help="Optional, decimal degrees">
              <input
                id="latitude"
                className="input"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="18.5204"
              />
            </Field>
            <Field label="Longitude" htmlFor="longitude" help="Optional, decimal degrees">
              <input
                id="longitude"
                className="input"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="73.8567"
              />
            </Field>
          </div>
          <div className="row mt-3">
            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
              {busy ? <span className="spin" /> : null}
              {busy ? "Saving…" : "Save property"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-3 mt-3">
        <div className="metric">
          <div className="metric-label">Properties</div>
          <div className="metric-value">{properties.length}</div>
          <div className="metric-sub">Active, not archived</div>
        </div>
        <div className="metric">
          <div className="metric-label">Assessments</div>
          <div className="metric-value">{assessments.length}</div>
          <div className="metric-sub">Every run is kept</div>
        </div>
        <div className="metric">
          <div className="metric-label">Harvest assessed</div>
          <div className="metric-value">
            {litres(totalLitres)}
          </div>
          <div className="metric-sub">Sum across all saved runs</div>
        </div>
      </div>

      <div className="split mt-3">
        <section>
          <div className="between">
            <h2>Properties</h2>
            <span className="small muted">{properties.length} total</span>
          </div>

          {loading ? (
            <div className="card card-pad muted mt-2">Loading…</div>
          ) : properties.length === 0 ? (
            <div className="empty mt-2">
              <h3>No properties yet</h3>
              <p>Add your first property to start an assessment.</p>
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                Add property
              </button>
            </div>
          ) : (
            <div className="list mt-2">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="list-item"
                >
                  <div>
                    <div className="title">{property.name}</div>
                    <div className="meta">
                      {property.address || "No address"}
                      {property.latitude !== null && property.longitude !== null
                        ? ` · ${property.latitude.toFixed(3)}, ${property.longitude.toFixed(3)}`
                        : ""}
                    </div>
                  </div>
                  <span className="badge badge-neutral">
                    {counts.get(property.id) ?? 0} assessment
                    {(counts.get(property.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="card card-pad">
          <div className="between">
            <h2>Recent runs</h2>
            <Link href="/assessments" className="small">
              View all
            </Link>
          </div>

          {assessments.length === 0 ? (
            <p className="small muted mt-2">
              Saved assessments will appear here with their system and yield.
            </p>
          ) : (
            <div className="list mt-2">
              {assessments.slice(0, 4).map((item) => (
                <Link key={item.id} href={`/assessments/${item.id}`} className="list-item">
                  <div>
                    <div className="title small">{item.label}</div>
                    <div className="meta">
                      {systemLabel(item.system)} · {litres(item.annual_net_litres)}
                    </div>
                    <div className="meta">{dateTime(item.created_at)}</div>
                  </div>
                  <StatusBadge status={item.recharge_status} />
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Protected>
        <Dashboard />
      </Protected>
    </AppShell>
  );
}
