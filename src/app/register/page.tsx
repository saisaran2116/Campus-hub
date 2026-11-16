"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await register(name, email, password, role);
      if (result.success) router.push(role === "ORGANIZER" ? "/dashboard/organizer" : "/events");
      else setError(result.error || "Unable to create your account.");
    } catch {
      setError("Unable to create your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-bold">Create an account</h1>
      <form onSubmit={submit} className="mt-6 grid gap-4 site-surface p-5 sm:p-6">
        <label className="grid gap-1 text-sm font-medium">
          Full name
          <input autoComplete="name" className="input input-bordered bg-transparent" required maxLength={120}
            value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input type="email" autoComplete="email" className="input input-bordered bg-transparent" required
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Password
          <input type="password" autoComplete="new-password" className="input input-bordered bg-transparent"
            required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Account type
          <select className="select select-bordered bg-white dark:bg-neutral-900" value={role}
            onChange={(event) => setRole(event.target.value)}>
            <option value="STUDENT">Student</option>
            <option value="ORGANIZER">Club organizer</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{error}</p>}
        <button disabled={loading} className="btn site-primary">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-sm">Already have an account? <Link href="/login" className="link font-semibold">Sign in</Link></p>
    </div>
  );
}
