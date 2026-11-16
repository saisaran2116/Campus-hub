"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Conflict = { conflictingEvent: { title: string }; overlap?: { formatted: string } };

export default function SaveEventButton({ eventId, title, saved, onChange, compact }: {
  eventId: string;
  title: string;
  saved: boolean;
  onChange: (saved: boolean) => void;
  compact?: boolean;
}) {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Conflict>();
  const dialog = useRef<HTMLDialogElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (conflict && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [conflict]);

  async function post(path: string) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (!response.ok) throw new Error("Could not update your schedule. Please try again.");
    return response.json();
  }

  async function update(confirmed = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!saved && !confirmed) {
        const result = await post("/api/saved/check-clash");
        if (result.hasClash && result.conflictingEvent) {
          setConflict(result);
          return;
        }
      }
      const result = await post("/api/saved/toggle");
      onChange(result.saved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update your schedule.");
    } finally {
      setBusy(false);
    }
  }

  const label = saved ? "Remove from schedule" : "Save to schedule";
  const Icon = saved ? BookmarkCheck : Bookmark;

  if (!loading && !user) return (
    <Link href={`/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
      className={compact ? "btn btn-square btn-sm site-secondary" : "btn site-secondary"}
      aria-label={`Sign in to save ${title}`}>
      <Bookmark size={18} aria-hidden="true" />{!compact && "Sign in to save"}
    </Link>
  );

  return (
    <div>
      <button type="button" disabled={busy || loading} aria-pressed={saved}
        aria-label={compact ? `${label}: ${title}` : undefined}
        className={compact ? "btn btn-square btn-sm site-secondary" : "btn site-secondary"}
        onClick={() => update()}>
        <Icon size={18} aria-hidden="true" />{!compact && (busy ? "Updating…" : saved ? "Saved to schedule" : label)}
      </button>
      {error && <p role="alert" className="site-link mt-2 text-sm">{error}</p>}
      {conflict && <dialog ref={dialog} className="modal" aria-labelledby={labelId} onClose={() => setConflict(undefined)}>
        <div className="modal-box site-surface">
          <h2 id={labelId} className="text-xl font-semibold">Schedule overlap</h2>
          <p className="site-muted mt-2">{title} overlaps with {conflict?.conflictingEvent.title}{conflict?.overlap?.formatted ? ` (${conflict.overlap.formatted})` : ""}.</p>
          <div className="modal-action flex-wrap">
            <form method="dialog"><button className="btn site-secondary">Cancel</button></form>
            <button type="button" className="btn site-primary" onClick={() => { dialog.current?.close(); update(true); }}>Save anyway</button>
          </div>
        </div>
      </dialog>}
    </div>
  );
}
