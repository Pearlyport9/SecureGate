"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const met = criteria.filter(Boolean).length;

  if (met <= 1) return { label: "Weak", color: "bg-error", width: "w-1/4" };
  if (met <= 3) return { label: "Fair", color: "bg-tertiary", width: "w-2/4" };
  return { label: "Strong", color: "bg-primary", width: "w-full" };
}

function validateField(name: string, value: string, password: string): string | undefined {
  switch (name) {
    case "password":
      if (!value) return "Password is required.";
      if (value.length < 8) return "Password must be at least 8 characters.";
      return undefined;
    case "confirmPassword":
      if (!value) return "Please confirm your password.";
      if (value !== password) return "Passwords do not match.";
      return undefined;
    default:
      return undefined;
  }
}

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const strength = getPasswordStrength(password);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setServerError("");
    setErrors((prev) => ({
      ...prev,
      password: validateField("password", value, value),
    }));
    if (confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: value !== confirmPassword ? "Passwords do not match." : undefined,
      }));
    }
  }, [confirmPassword]);

  function handleConfirmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setConfirmPassword(value);
    setServerError("");
    setErrors((prev) => ({
      ...prev,
      confirmPassword: validateField("confirmPassword", value, password),
    }));
  }

  function validateAll(): boolean {
    const newErrors: FieldErrors = {};
    const passwordErr = validateField("password", password, password);
    const confirmErr = validateField("confirmPassword", confirmPassword, password);
    if (passwordErr) newErrors.password = passwordErr;
    if (confirmErr) newErrors.confirmPassword = confirmErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validateAll()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/");
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!params.token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Missing reset token</h1>
          <p className="mb-6 text-sm text-gray-500">This reset link is invalid. Please request a new one.</p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
        style={{ width: '100%', maxWidth: '448px', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Reset password</h1>

        {serverError && (
          <p className="mb-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
          <div style={{ width: '100%', marginBottom: '20px' }}>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className={`rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Password strength: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          <div style={{ width: '100%', marginBottom: '20px' }}>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmChange}
              className={`rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', backgroundColor: '#16a34a', color: 'white', fontWeight: '600', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'block' }}
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/auth" className="font-semibold text-green-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
