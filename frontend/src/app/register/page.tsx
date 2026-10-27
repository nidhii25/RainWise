"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Include at least one letter and one number.");
      return;
    }

    setBusy(true);
    try {
      await register(email, password, fullName);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="auth-wrap">
        <div className="auth-card">
          <span className="eyebrow">Start here</span>
          <h1>Create your account</h1>
          <p className="sub">
            One account holds every property you survey and every assessment you run.
          </p>

          <form onSubmit={submit} className="stack-sm">
            {error ? <div className="form-error">{error}</div> : null}

            <Field label="Name" htmlFor="name" help="Optional. Shown in the header.">
              <input
                id="name"
                className="input"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>

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

            <Field
              label="Password"
              htmlFor="password"
              help="At least 10 characters, with a letter and a number."
            >
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            <Field label="Confirm password" htmlFor="confirm">
              <input
                id="confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>

            <button type="submit" className="btn btn-primary btn-block mt-2" disabled={busy}>
              {busy ? <span className="spin" /> : null}
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="auth-foot">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
