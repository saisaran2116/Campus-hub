"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

interface Draft {
  _id: string;
  content: { title: string; notes: string };
}

const blank = { title: "", notes: "" };

export default function DraftsPage() {
  const { user, loading } = useAuth();
  const canEdit = user?.role === "ORGANIZER" || user?.role === "CAMPUS_MANAGER";

  return (
    <div className="site-width py-10 sm:py-12">
      <h1 className="text-balance text-4xl font-bold">Event drafts</h1>
      <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-300">Keep private notes while you plan an event.</p>
      {loading ? <p className="mt-5" role="status">Checking your session…</p> : canEdit ? (
        <DraftsWorkspace key={user.id} />
      ) : (
        <p className="mt-6">Drafts are available to organizers and managers. {!user && <Link href="/login" className="link">Sign in</Link>}</p>
      )}
    </div>
  );
}

function DraftsWorkspace() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [removing, setRemoving] = useState<Draft>();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/drafts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load drafts.");
        const data = await response.json();
        if (!controller.signal.aborted) setDrafts(data.drafts);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load drafts. Refresh to try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch(editing ? `/api/drafts/${editing}` : "/api/drafts", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDrafts((current) => [result, ...current.filter(({ _id }) => _id !== result._id)].slice(0, 50));
      setEditing(null);
      setForm(blank);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save the draft.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    dialog.current?.close();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete the draft.");
      setDrafts((current) => current.filter(({ _id }) => _id !== id));
      if (editing === id) {
        setEditing(null);
        setForm(blank);
      }
    } catch {
      setError("Unable to delete the draft. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
        <div className="mt-8 grid items-start gap-8 md:grid-cols-2">
          <form onSubmit={save} className="grid gap-4 site-surface p-5">
            <h2 className="text-xl font-semibold">{editing ? "Edit draft" : "New draft"}</h2>
            <label className="grid gap-1 text-sm font-medium">
              Title
              <input className="input input-bordered bg-transparent" required maxLength={240}
                value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Notes
              <textarea className="textarea textarea-bordered min-h-28 bg-transparent" maxLength={5000}
                value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            {error && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{error}</p>}
            <div className="flex gap-3">
              <button disabled={pending || fetching} className="btn site-primary">Save draft</button>
              {editing && (
                <button type="button" className="btn site-secondary" onClick={() => { setEditing(null); setForm(blank); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <section aria-label="Saved drafts">
            {fetching ? <p role="status">Loading drafts…</p> : !drafts.length ? <p>Your saved drafts will appear here.</p> : (
              <ul className="divide-y divide-neutral-300 dark:divide-neutral-700">
                {drafts.map((draft) => (
                  <li key={draft._id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0 break-words font-medium">{draft.content.title}</span>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={pending} className="btn btn-ghost btn-sm"
                        onClick={() => { setEditing(draft._id); setForm(draft.content); }}>Edit</button>
                      <button type="button" disabled={pending} className="btn btn-ghost btn-sm"
                        onClick={() => { setRemoving(draft); dialog.current?.showModal(); }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      <dialog ref={dialog} role="alertdialog" aria-labelledby="draft-delete-title" className="modal">
        <div className="modal-box bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">
          <h2 id="draft-delete-title" className="text-lg font-semibold">Delete draft?</h2>
          <p className="mt-2 break-words">{removing?.content.title}</p>
          <div className="modal-action">
            <form method="dialog"><button autoFocus className="btn site-secondary">Cancel</button></form>
            <button type="button" className="btn site-primary"
              onClick={() => { if (removing) remove(removing._id); }}>Delete draft</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
