"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface FieldErrors {
  name?: string;
  email?: string;
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

function validateField(name: string, value: string, allValues: { name: string; email: string; password: string; confirmPassword: string }): string | undefined {
  switch (name) {
    case "name":
      if (!value.trim()) return "Full name is required.";
      return undefined;
    case "email":
      if (!value.trim()) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
      return undefined;
    case "password":
      if (!value) return "Password is required.";
      if (value.length < 8) return "Password must be at least 8 characters.";
      return undefined;
    case "confirmPassword":
      if (!value) return "Please confirm your password.";
      if (value !== allValues.password) return "Passwords do not match.";
      return undefined;
    default:
      return undefined;
  }
}

function SignupForm({ onToggle }: { onToggle: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = getPasswordStrength(form.password);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      const fieldError = validateField(name, value, next);
      setErrors((prevErrors) => ({ ...prevErrors, [name]: fieldError }));
      if (name === "password" && prev.confirmPassword) {
        const confirmError = value !== prev.confirmPassword ? "Passwords do not match." : undefined;
        setErrors((prevErrors) => ({ ...prevErrors, confirmPassword: confirmError }));
      }
      return next;
    });
    setServerError("");
  }, []);

  function validateAll(): FieldErrors {
    const newErrors: FieldErrors = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
      const err = validateField(key, form[key], form);
      if (err) newErrors[key] = err;
    });
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const validationErrors = validateAll();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("Signup fetch error:", err);
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-center text-3xl font-bold text-on-surface">
        Create your account
      </h1>
      <p className="mb-6 text-center text-sm text-on-surface-variant">
        Join SecureGate today.
      </p>

      {serverError && (
        <p className="mb-6 rounded-xl bg-error-container p-4 text-center text-sm text-error">
          {serverError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label htmlFor="auth-name" className="mb-2 block text-sm font-medium text-on-surface-variant">
            Full name
          </label>
          <input
            autoFocus
            id="auth-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-3 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.name ? "border-error" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-error">{errors.name}</p>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="auth-signup-email" className="mb-2 block text-sm font-medium text-on-surface-variant">
            Email address
          </label>
          <input
            id="auth-signup-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-3 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.email ? "border-error" : "border-gray-300"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-error">{errors.email}</p>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="auth-signup-password" className="mb-2 block text-sm font-medium text-on-surface-variant">
            Password
          </label>
          <div className="relative">
            <input
              id="auth-signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              className={`w-full rounded-lg border px-4 py-3 pr-10 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.password ? "border-error" : "border-gray-300"
              }`}
            />
            {form.password.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-error">{errors.password}</p>
          )}

          {form.password.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
                <div
                  className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}
                />
              </div>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Password strength: <span className="font-medium">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="auth-confirmPassword" className="mb-2 block text-sm font-medium text-on-surface-variant">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="auth-confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              className={`w-full rounded-lg border px-4 py-3 pr-10 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.confirmPassword ? "border-error" : "border-gray-300"
              }`}
            />
            {form.confirmPassword.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-error">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-on-primary transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Already have an account?{" "}
        <button type="button" onClick={onToggle} className="font-semibold text-primary hover:underline">
          Sign in
        </button>
      </p>
    </>
  );
}

function LoginForm({ onToggle }: { onToggle: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === "EmailNotVerified") {
        setError(
          "Please verify your email before logging in. Check your inbox for the verification link."
        );
        return;
      }

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-center text-3xl font-bold text-on-surface">
        Sign in
      </h1>
      <p className="mb-6 text-center text-sm text-on-surface-variant">
        Good to have you back.
      </p>

      {error && (
        <p className="mb-6 rounded-xl bg-error-container p-4 text-center text-sm text-error">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="auth-login-email" className="mb-2 block text-sm font-medium text-on-surface-variant">
            Email address
          </label>
          <input
            autoFocus
            id="auth-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="auth-login-password" className="text-sm font-medium text-on-surface-variant">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm text-on-surface-variant transition hover:text-primary">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="auth-login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 text-base text-on-surface outline-none transition focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-on-primary transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={onToggle} className="font-semibold text-primary hover:underline">
          Sign up
        </button>
      </p>
    </>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="w-full max-w-md min-w-[400px] rounded-2xl bg-surface p-8">
      <div className="min-h-[460px]">
        {mode === "login" ? (
          <LoginForm onToggle={() => setMode("signup")} />
        ) : (
          <SignupForm onToggle={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}
