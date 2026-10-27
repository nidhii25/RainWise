"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [loading, user, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Welcome back</span>
      <h1>Sign in</h1>
      <p className="sub">Your properties and assessment history are waiting.</p>

      <form onSubmit={submit} className="stack-sm">
        {error ? <div className="form-error">{error}</div> : null}

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="between">
          <span className="tiny muted">10 characters minimum</span>
          <Link href="/forgot-password" className="tiny">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block mt-2" disabled={busy}>
          {busy ? <span className="spin" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-foot">
        New to RainWise? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AppShell>
      <div className="auth-wrap">
        <Suspense fallback={<div className="card card-pad muted">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
