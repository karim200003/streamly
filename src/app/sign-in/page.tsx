"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] grid place-items-center">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Could not create account");
        }
      }
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) throw new Error("Invalid email or password");
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4">
      <div className="w-full max-w-md p-7 rounded-2xl glass">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {mode === "signin"
            ? "Sign in to sync your watchlist and continue watching."
            : "Sign up to save favorites and watch history."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <input
            required
            type="password"
            minLength={mode === "signup" ? 10 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signup"
                ? "Password (min. 10 chars)"
                : "Password"
            }
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {err && (
            <p className="text-sm text-[var(--color-accent)]" role="alert">
              {err}
            </p>
          )}
          <button
            disabled={busy}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-sm text-center text-[var(--color-muted)]">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-white hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have one?{" "}
              <button
                onClick={() => setMode("signin")}
                className="text-white hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-[var(--color-muted)] hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
