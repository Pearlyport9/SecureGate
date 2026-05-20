"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic'

type VerificationStatus =
  | { state: "loading" }
  | { state: "success"; message: string }
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "error"; message: string };

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<VerificationStatus>({ state: "loading" });
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  const verify = useCallback(async () => {
    setStatus({ state: "loading" });

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ state: "success", message: data.message });
      } else if (data.error === "expired") {
        setStatus({ state: "expired" });
      } else if (data.error === "invalid") {
        setStatus({ state: "invalid" });
      } else {
        setStatus({ state: "error", message: data.error ?? "Something went wrong." });
      }
    } catch {
      setStatus({ state: "error", message: "Something went wrong. Please try again." });
    }
  }, [params.token]);

  useEffect(() => {
    verify();
  }, [verify]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ state: "success", message: data.message });
      } else {
        setStatus({ state: "error", message: data.error ?? "Something went wrong." });
      }
    } catch {
      setStatus({ state: "error", message: "Something went wrong. Please try again." });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        {status.state === "loading" && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
            <p className="text-on-surface-variant">Verifying your email...</p>
          </>
        )}

        {status.state === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
              <svg className="h-7 w-7 text-on-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold text-on-surface">Email verified</h1>
            <p className="mb-6 text-on-surface-variant">{status.message}</p>
            <Link
              href="/"
              className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:brightness-90"
            >
              Sign in
            </Link>
          </>
        )}

        {status.state === "invalid" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
              <svg className="h-7 w-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold text-on-surface">Invalid link</h1>
            <p className="mb-6 text-on-surface-variant">
              This verification link is invalid or has already been used.
            </p>
            <ResendForm email={resendEmail} setEmail={setResendEmail} onSubmit={handleResend} loading={resending} />
          </>
        )}

        {status.state === "expired" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tertiary">
              <svg className="h-7 w-7 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold text-on-surface">Link expired</h1>
            <p className="mb-6 text-on-surface-variant">
              This verification link has expired. Enter your email below to receive a new one.
            </p>
            <ResendForm email={resendEmail} setEmail={setResendEmail} onSubmit={handleResend} loading={resending} />
          </>
        )}

        {status.state === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
              <svg className="h-7 w-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold text-on-surface">Something went wrong</h1>
            <p className="mb-6 text-on-surface-variant">{status.message}</p>
            <Link
              href="/"
              className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:brightness-90"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ResendForm({
  email,
  setEmail,
  onSubmit,
  loading,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-md border border-outline px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Resend verification email"}
      </button>
    </form>
  );
}
