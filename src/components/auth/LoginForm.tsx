"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";
type Step = "form" | "loading" | "check_email";

const ERROR_MAP: Record<string, string> = {
  confirmation_failed: "Email confirmation failed. Please try signing in.",
  account_deleted:     "This account has been deleted.",
};

interface LoginFormProps {
  redirectTo: string;
  error?: string;
}

export default function LoginForm({ redirectTo, error: initialError }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode]           = useState<Mode>("signin");
  const [step, setStep]           = useState<Step>("form");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [formError, setFormError] = useState(ERROR_MAP[initialError ?? ""] ?? initialError ?? "");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address";
    }
    if (password.length < (mode === "signup" ? 8 : 1)) {
      errors.password = mode === "signup"
        ? "Password must be at least 8 characters"
        : "Password is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setStep("loading");

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStep("form");
        setFormError(data.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      // Signup with email confirmation required
      if (mode === "signup" && data.data?.confirmed === false) {
        setStep("check_email");
        return;
      }

      // Redirect based on consent status
      if (data.data?.needs_consent) {
        router.push("/consent");
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setStep("form");
      setFormError("Network error. Please check your connection.");
    }
  }

  // ── Switch mode ─────────────────────────────────────────────────────────
  function switchMode(newMode: Mode) {
    setMode(newMode);
    setFormError("");
    setFieldErrors({});
    setStep("form");
  }

  // ── Check email screen ──────────────────────────────────────────────────
  if (step === "check_email") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center animate-fade-in px-4">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-4xl">
          ✉️
        </div>
        <div>
          <h2 className="text-white font-serif text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-ghana-gold font-semibold">{email}</span>.
            Click it to activate your account.
          </p>
        </div>
        <button
          onClick={() => { setStep("form"); setMode("signin"); }}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── Loading screen ──────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-ghana-gold border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">
          {mode === "signup" ? "Creating your account…" : "Signing you in…"}
        </p>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">
      {/* Mode toggle */}
      <div className="flex bg-white/8 rounded-2xl p-1 mb-6 border border-white/10">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`
              flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${mode === m
                ? "bg-ghana-gold text-ghana-black shadow"
                : "text-gray-400 hover:text-gray-200"}
            `}
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {formError && (
        <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm animate-fade-in">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete={mode === "signup" ? "email" : "username"}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            placeholder="you@example.com"
            className={`
              input text-white bg-white/10 border-white/20 placeholder:text-gray-600
              focus:border-ghana-gold
              ${fieldErrors.email ? "border-ghana-red bg-red-950/30" : ""}
            `}
            disabled={step === "loading"}
          />
          {fieldErrors.email && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              Password
            </label>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
              className={`
                input pr-12 text-white bg-white/10 border-white/20 placeholder:text-gray-600
                focus:border-ghana-gold
                ${fieldErrors.password ? "border-ghana-red bg-red-950/30" : ""}
              `}
              disabled={step === "loading"}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
              tabIndex={-1}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
          )}
          {mode === "signup" && !fieldErrors.password && (
            <p className="text-gray-600 text-xs mt-1">At least 8 characters</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={step === "loading"}
          className="btn-primary w-full mt-2 py-4 text-base"
        >
          {mode === "signin" ? "Sign In →" : "Create Account →"}
        </button>
      </form>

      {/* Bottom privacy note */}
      <p className="mt-6 text-center text-xs text-gray-600 leading-relaxed">
        {mode === "signup"
          ? "Your email is used for account access only. It is never shown publicly."
          : "Sign in to report issues and hold your leaders accountable."}
      </p>
    </div>
  );
}
