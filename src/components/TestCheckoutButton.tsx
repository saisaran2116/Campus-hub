"use client";

import { useState } from "react";

export default function TestCheckoutButton({ eventId, hasTicket }: { eventId: string; hasTicket: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to start checkout.");
      setLoading(false);
    }
  }

  if (hasTicket) return <p className="text-sm font-semibold">Test ticket confirmed</p>;
  return (
    <div>
      <button className="btn site-secondary" type="button" disabled={loading} onClick={checkout}>
        {loading ? "Opening checkout…" : "Get a test ticket"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-800 dark:text-red-300">{error}</p>}
    </div>
  );
}
