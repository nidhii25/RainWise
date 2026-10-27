"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 10 characters, with a letter and a number.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.resetPassword(token, password);
      setMessage(result.message);
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Account recovery</span>
      <h1>Choose a new password</h1>
      <p className="sub">Resetting signs you out on every device.</p>

      <form onSubmit={submit} className="stack-sm">
        {error ? <div className="form-error">{error}</div> : null}
        {message ? <div className="form-success">{message}</div> : null}

        <Field label="Reset token" htmlFor="token">
          <input
            id="token"
            className="input mono"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>

        <Field label="New password" htmlFor="password">
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

        <Field label="Confirm new password" htmlFor="confirm">
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
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="auth-foot">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <div className="auth-wrap">
        <Suspense fallback={<div className="card card-pad muted">Loading…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
