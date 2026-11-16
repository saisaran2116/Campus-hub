"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

const reasons = [
  "Information doesn't match poster",
  "Event cannot be verified",
  "Invalid date",
  "Invalid time",
  "Invalid venue",
  "Duplicate event",
  "Unauthorized organizer",
  "Other",
];

export default function DeclineReasonModal({ isOpen, onClose, onConfirmDecline, eventTitle }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDecline: (reason: string, notes: string) => Promise<boolean>;
  eventTitle: string;
}) {
  const [reason, setReason] = useState(reasons[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [isOpen]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      if (await onConfirmDecline(reason, notes)) onClose();
      else setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;
  return (
    <dialog ref={dialog} className="modal" aria-labelledby={titleId} onCancel={(event) => {
      if (submitting) event.preventDefault();
      else onClose();
    }}>
      <div className="modal-box site-surface">
        <h2 id={titleId} className="text-xl font-semibold">Decline event</h2>
        <p className="site-muted mt-2 text-pretty">Send feedback to the organizer of {eventTitle}.</p>
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            Reason
            <select className="select select-bordered w-full bg-transparent" value={reason} onChange={(event) => setReason(event.target.value)} disabled={submitting}>
              {reasons.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Notes {reason !== "Other" && "(optional)"}
            <textarea className="textarea textarea-bordered bg-transparent" rows={3} maxLength={500}
              required={reason === "Other"} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={submitting} />
          </label>
          {error && <p role="alert" className="site-link text-sm">Could not decline the event. Please try again.</p>}
          <div className="modal-action mt-0 flex-wrap">
            <button type="button" className="btn site-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn site-primary" disabled={submitting}>{submitting ? "Submitting…" : "Decline event"}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
