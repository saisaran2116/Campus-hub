"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const roles = [
  ["STUDENT", "Student"],
  ["ORGANIZER", "Organizer"],
  ["CAMPUS_MANAGER", "Manager"],
] as const;

export default function DemoSwitcherBar() {
  const { user, demoLogin, loading } = useAuth();
  const [error, setError] = useState("");
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  async function switchRole(role: typeof roles[number][0]) {
    setError("");
    try {
      await demoLogin(role);
    } catch {
      setError("Could not switch accounts.");
    }
  }

  return (
    <div className="border-b border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-2 sm:px-8">
        <span className="mr-2 text-sm font-semibold">Demo accounts</span>
        {roles.map(([role, label]) => (
          <button key={role} type="button" disabled={loading} aria-pressed={user?.role === role}
            onClick={() => switchRole(role)}
            className="btn btn-ghost btn-xs aria-pressed:bg-neutral-300 dark:aria-pressed:bg-neutral-700">
            {label}
          </button>
        ))}
        {error && <span role="alert" className="text-sm">{error}</span>}
      </div>
    </div>
  );
}
