"use client";

import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useAuth } from "@/lib/auth";

const DELIVERABLES = [
  {
    title: "How much you can catch",
    body: "Gross rainfall, first flush, filter loss, and the net litres your roof actually delivers, month by month.",
  },
  {
    title: "A tank that fits the dry season",
    body: "A monthly water balance sweeps buildable tank sizes and reports the reliability each one actually achieves.",
  },
  {
    title: "A recharge structure, or a clear no",
    body: "Infiltration, water-table depth, setback, space, and slope are checked one by one. Missing data is never a pass.",
  },
  {
    title: "What to install",
    body: "Tank dimensions, pit or trench sizing, pipe diameters, filter media, excavation, and quantities a contractor can quote.",
  },
];

const STEPS = [
  { title: "Add a property", body: "A name and a place. Coordinates are optional." },
  { title: "Enter the roof", body: "Area and material for each roof segment." },
  { title: "Answer the site questions", body: "Rainfall, demand, infiltration, water table, setback." },
  { title: "Get the design", body: "Sizing, 3D view, piping, quantities, and a printable report." },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">Rooftop rainwater harvesting</span>
            <h1>Know exactly how much rain your roof can catch.</h1>
            <p>
              RainWise turns roof dimensions, local rainfall, and site conditions into
              a sized tank, a recharge structure, and a buildable parts list — with
              every assumption and source shown.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link href="/dashboard" className="btn btn-primary">
                  Go to your properties
                </Link>
              ) : (
                <>
                  <Link href="/register" className="btn btn-primary">
                    Create a free account
                  </Link>
                  <Link href="/login" className="btn btn-ghost">
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <p className="small muted mt-3">
              Individual accounts · unlimited properties · every assessment kept as history
            </p>
          </div>

          <div className="hero-art">
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>Rainfall → litres</strong>
                <span>Monthly water balance, not an annual guess</span>
              </div>
              <div className="hero-stat">
                <strong>Tank → reliability</strong>
                <span>See what each size actually delivers</span>
              </div>
              <div className="hero-stat">
                <strong>Site → recharge</strong>
                <span>Five-state verdict with reasons</span>
              </div>
              <div className="hero-stat">
                <strong>Design → build</strong>
                <span>Dimensions, pipes, media, quantities</span>
              </div>
            </div>

            <div className="card card-pad mt-3" style={{ background: "rgba(255,255,255,0.86)" }}>
              <span className="eyebrow">The chain</span>
              <div className="row mt-2" style={{ gap: 8 }}>
                <span className="badge badge-neutral">Roof</span>
                <span className="muted">→</span>
                <span className="badge badge-neutral">First flush</span>
                <span className="muted">→</span>
                <span className="badge badge-neutral">Filter</span>
                <span className="muted">→</span>
                <span className="badge badge-neutral">Tank</span>
                <span className="muted">→</span>
                <span className="badge badge-neutral">Recharge</span>
              </div>
              <p className="small muted mt-2">
                Each loss is shown separately, so the final litres are traceable.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <span className="eyebrow">What you get</span>
          <div className="grid grid-4 mt-2">
            {DELIVERABLES.map((item) => (
              <div key={item.title} className="card card-pad">
                <h3>{item.title}</h3>
                <p className="small muted mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <span className="eyebrow">How it works</span>
          <div className="steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="step">
                <div className="step-num">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad mt-4">
          <div className="split">
            <div>
              <h2>Built to show its work</h2>
              <p className="muted mt-2">
                Every coefficient carries a source. Every recharge criterion shows its
                value, threshold, and result. A missing measurement returns “more data
                needed”, never a silent pass.
              </p>
            </div>
            <div className="stack-sm">
              <div className="notice notice-info">
                <span>◐</span>
                <span>
                  Rainfall can be entered manually or pulled from a monthly series.
                  Tank sizing needs a monthly series; annual-only input reports yield
                  without a tank recommendation.
                </span>
              </div>
              <div className="notice notice-warn">
                <span>!</span>
                <span>
                  Recharge is only recommended when infiltration, water-table depth,
                  setback, space, and slope are all known and pass.
                </span>
              </div>
            </div>
          </div>
          <Disclaimer />
        </section>
      </div>
    </AppShell>
  );
}
