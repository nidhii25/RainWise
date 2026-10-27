"use client";

import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetToken(null);
    setBusy(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
      setResetToken(result.reset_token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="auth-wrap">
        <div className="auth-card">
          <span className="eyebrow">Account recovery</span>
          <h1>Reset your password</h1>
          <p className="sub">
            Enter the email on your account. If it exists, a reset is created.
          </p>

          <form onSubmit={submit} className="stack-sm">
            {error ? <div className="form-error">{error}</div> : null}
            {message ? <div className="form-success">{message}</div> : null}

            <Field label="Email" htmlFor="email">
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <button type="submit" className="btn btn-primary btn-block mt-2" disabled={busy}>
              {busy ? <span className="spin" /> : null}
              {busy ? "Working…" : "Create reset"}
            </button>
          </form>

          {resetToken ? (
            <div className="notice notice-warn mt-3">
              <span>!</span>
              <span>
                Development mode: this reset token is shown here because no email
                service is configured. Use it on the reset page.
                <br />
                <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`}>
                  Continue to reset
                </Link>
              </span>
            </div>
          ) : null}

          <p className="auth-foot">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
