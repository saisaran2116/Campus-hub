"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { parseTimeToMinutes } from "@/lib/clash";
import { SAMPLE_POSTERS, type ExtractedEventData } from "@/lib/poster-samples";

const categories = ["Workshop", "Hackathon", "Cultural", "Technical", "Sports", "Seminar", "Competition", "Club", "Fest"];
const imageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const empty = {
  title: "", date: "", startTime: "", endTime: "", venue: "", organizerName: "",
  category: "Workshop", description: "", summary: "", tags: "", registrationUrl: "", contactInfo: "",
};

type Form = typeof empty;
type Confidence = ExtractedEventData["confidences"];
type Mode = "AI" | "MANUAL";

function readPoster(file: File) {
  if (!imageTypes.includes(file.type) || file.size > 6 * 1024 * 1024) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image up to 6 MB.");
  }
  // Promises vs callbacks: adapt FileReader events so callers can await the result.
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the poster."));
    reader.readAsDataURL(file);
  });
}

function cleanField(value: string) {
  return value === "Not specified" || value === "Needs verification" ? "" : value;
}

function toTime(value: string) {
  const minutes = parseTimeToMinutes(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function initialDetails(data: ExtractedEventData): Form {
  return {
    title: cleanField(data.title), date: cleanField(data.date), startTime: toTime(data.startTime),
    endTime: toTime(data.endTime), venue: cleanField(data.venue), organizerName: cleanField(data.organizerName),
    category: categories.includes(data.category) ? data.category : "",
    description: cleanField(data.description), summary: cleanField(data.summary), tags: data.tags.join(", "),
    registrationUrl: cleanField(data.registrationUrl), contactInfo: cleanField(data.contactInfo),
  };
}

const fieldClass = "input input-bordered w-full min-w-0 bg-transparent";
const outlineButton = "btn site-secondary";

export default function CreateEventStudio({ initialMode = "AI", onComplete }: {
  initialMode?: Mode;
  onComplete?: () => void;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modeOverride, setModeOverride] = useState<{ initial: Mode; value: Mode }>();
  const mode = modeOverride?.initial === initialMode ? modeOverride.value : initialMode;
  const [form, setForm] = useState<Form>(empty);
  const [poster, setPoster] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [file, setFile] = useState<File>();
  const [sampleId, setSampleId] = useState("");
  const [confidence, setConfidence] = useState<Confidence>();
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ hasConflict?: boolean; reason?: string; type?: string }>();
  const [conflictError, setConflictError] = useState(false);
  const canSubmit = user?.role === "ORGANIZER" || user?.role === "CAMPUS_MANAGER";
  const { title, date, startTime, endTime, venue } = form;

  useEffect(() => {
    if (!canSubmit || !title.trim() || !date || !startTime || !endTime || !venue.trim()) {
      setConflict(undefined);
      setConflictError(false);
      return;
    }

    const controller = new AbortController();
    setConflict(undefined);
    setConflictError(false);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/organizer/check-conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, date, startTime, endTime, venue }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Conflict check failed.");
        const result = await response.json();
        if (!controller.signal.aborted) setConflict(result);
      } catch {
        if (!controller.signal.aborted) setConflictError(true);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSubmit, title, date, startTime, endTime, venue]);

  async function importPoster() {
    setBusy(true);
    setPosterError("");
    try {
      const content = file ? await readPoster(file) : undefined;
      const response = await fetch("/api/ai/analyze-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content ? { imageData: content, mimeType: file?.type } : { sampleId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not analyze the poster.");
      setForm(initialDetails(result.extractedData));
      setPosterUrl("");
      setConfidence(result.extractedData.confidences);
      setPoster(content || SAMPLE_POSTERS.find(({ id }) => id === sampleId)?.previewUrl || "");
      setConflict(result.duplicateCheck?.hasPotentialDuplicate ? { hasConflict: true, reason: result.duplicateCheck.reason } : undefined);
    } catch (failure) {
      setPosterError(failure instanceof Error ? failure.message : "Could not analyze the poster.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const artwork = mode === "MANUAL" && file ? await readPoster(file) : posterUrl.trim() || poster;
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          posterUrl: artwork || undefined,
          confidences: confidence ?? { isManualEntry: true },
          duplicatesDetected: conflict?.hasConflict ? conflict : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your event.");
      if (onComplete) onComplete();
      else router.push(user?.role === "CAMPUS_MANAGER" ? "/dashboard/manager" : "/dashboard/organizer");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not submit your event.");
    } finally {
      setSubmitting(false);
    }
  }

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (loading) return <p role="status">Checking your session…</p>;
  if (!canSubmit) return (
    <p className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700">
      Organizers and campus managers can submit events. {!user && <Link href="/login" className="link">Sign in to continue</Link>}
    </p>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <aside className="grid gap-4 site-surface p-5">
        <h2 className="text-lg font-semibold">Event poster</h2>
        <div className="flex flex-wrap gap-2" aria-label="Entry method">
          {(["AI", "MANUAL"] as const).map((value) => (
            <button key={value} className={outlineButton + " btn-sm aria-pressed:bg-neutral-200 dark:aria-pressed:bg-neutral-800"}
              type="button" disabled={busy || submitting} aria-pressed={mode === value}
              onClick={() => {
                setModeOverride({ initial: initialMode, value });
                setFile(undefined);
                setPosterError("");
              }}>
              {value === "AI" ? "Extract details" : "Enter details"}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-sm font-medium">
          {mode === "AI" ? "Upload poster" : "Upload image (optional)"}
          <input key={mode} type="file" accept={imageTypes.join(",")} disabled={busy || submitting}
            className="file-input file-input-bordered w-full min-w-0 bg-transparent"
            onChange={(event) => { setFile(event.target.files?.[0]); setSampleId(""); setPosterError(""); }} />
        </label>
        {mode === "AI" ? (
          <>
            <label className="grid gap-1 text-sm font-medium">
              Or use a sample
              <select value={sampleId} disabled={busy || submitting || !!file}
                className="select select-bordered w-full bg-white dark:bg-neutral-900"
                onChange={(event) => setSampleId(event.target.value)}>
                <option value="">Choose a sample</option>
                {SAMPLE_POSTERS.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
              </select>
            </label>
            <button type="button" className={outlineButton} disabled={busy || submitting || (!file && !sampleId)} onClick={importPoster}>
              {busy ? "Analyzing poster…" : "Fill in details"}
            </button>
            {poster && (
              <div className="grid gap-2">
                {/* Local image data can be displayed without the image optimization server. */}
                <img alt="Selected event poster" className="max-h-48 w-full rounded-lg object-contain" src={poster} />
                <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setPoster("")}>Remove image</button>
              </div>
            )}
          </>
        ) : (
          <label className="grid gap-1 text-sm font-medium">
            Or enter an image URL
            <input type="url" className={fieldClass} value={posterUrl} onChange={(event) => setPosterUrl(event.target.value)} />
          </label>
        )}
        {posterError && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{posterError}</p>}
      </aside>

      <form onSubmit={submit} className="site-surface p-5">
        <fieldset disabled={busy || submitting} className="grid min-w-0 gap-4">
          <legend className="mb-4 text-lg font-semibold">Event details</legend>
          {confidence && <p className="text-sm text-neutral-600 dark:text-neutral-300">Check the imported details against the poster before submitting.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { key: "title", label: "Event title", required: true },
              { key: "date", label: "Date", type: "date", required: true },
              { key: "startTime", label: "Start time", type: "time", required: true },
              { key: "endTime", label: "End time", type: "time", required: true },
              { key: "venue", label: "Venue", required: true },
              { key: "organizerName", label: "Organizer", placeholder: user.name },
              { key: "registrationUrl", label: "Registration URL", type: "url" },
              { key: "contactInfo", label: "Contact information", placeholder: user.email },
              { key: "tags", label: "Tags", placeholder: "Separate tags with commas" },
            ] satisfies { key: keyof Form; label: string; type?: string; required?: boolean; placeholder?: string }[])
              .map(({ key, label, type, required, placeholder }) => (
                <label key={key} className="grid gap-1 text-sm font-medium">
                  <span>{label}{confidence?.[key] === "LOW" && <span className="ml-2 text-xs font-normal text-amber-800 dark:text-amber-300">Verify</span>}</span>
                  <input type={type ?? "text"} required={required} className={fieldClass} value={form[key]}
                    maxLength={key === "registrationUrl" ? 5000 : 240} placeholder={placeholder}
                    onChange={(event) => update(key, event.target.value)} />
                </label>
              ))}
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select required value={form.category} className="select select-bordered w-full bg-white dark:bg-neutral-900"
                onChange={(event) => update("category", event.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          {(["summary", "description"] as const).map((key) => (
            <label className="grid gap-1 text-sm font-medium" key={key}>
              {key === "summary" ? "Short summary" : "Description"}
              <textarea className="textarea textarea-bordered bg-transparent" rows={key === "summary" ? 2 : 4}
                maxLength={5000} value={form[key]} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
          {conflict?.hasConflict && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">{conflict.reason || "Check for a possible schedule conflict."}</p>}
          {conflictError && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">Could not check the schedule. Confirm the venue and time before submitting.</p>}
          {error && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{error}</p>}
          <button className="btn site-primary justify-self-start">
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
