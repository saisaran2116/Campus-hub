"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm({ googleEnabled, googleError, returnTo }: {
  googleEnabled: boolean;
  returnTo: string;
  googleError?: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    googleError === "existing" ? "An account already uses this email. Sign in with your password."
      : googleError === "google" ? "Google sign-in did not complete. Try again." : "",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result.success) router.push(returnTo);
      else setError(result.error || "Check your email and password.");
    } catch {
      setError("Unable to sign in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="mt-6 grid gap-4 site-surface p-5 sm:p-6">
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input type="email" autoComplete="email" required className="input input-bordered bg-transparent"
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Password
          <input type="password" autoComplete="current-password" required className="input input-bordered bg-transparent"
            value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{error}</p>}
        <button disabled={loading} className="btn site-primary">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {googleEnabled && <a href="/api/auth/google" className="btn site-secondary">Continue with Google</a>}
      </form>
      <p className="mt-5 text-sm">New to CampusHub? <Link className="link font-semibold" href="/register">Create an account</Link></p>
    </div>
  );
}
