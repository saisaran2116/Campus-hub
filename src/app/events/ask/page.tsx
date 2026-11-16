"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

export default function EventAssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setAnswer("");
    setError("");
    try {
      const response = await fetch("/api/ai/event-assistant", {
        method: "POST",
        signal: request.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message);
      }
      if (!response.body) throw new Error("No reply was received.");
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((current) => current + value);
      }
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load suggestions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/events" className="link link-hover text-sm">← Browse events</Link>
      <h1 className="mt-4 text-balance text-4xl font-bold">Find an event by interest</h1>
      <form onSubmit={ask} className="mt-6 grid gap-3">
        <label htmlFor="event-question" className="font-medium">What would you like to attend?</label>
        <textarea id="event-question" className="textarea textarea-bordered min-h-24 bg-transparent"
          placeholder="For example, a workshop for beginners" required minLength={3} maxLength={600}
          value={question} onChange={(event) => setQuestion(event.target.value)} />
        <div className="flex gap-3">
          <button className="btn site-primary" disabled={loading}>Find events</button>
          {loading && <button type="button" className="btn site-secondary" onClick={() => controller.current?.abort()}>Stop</button>}
        </div>
      </form>
      {loading && <p role="status" className="mt-6 text-sm">Finding events…</p>}
      {error && <p role="alert" className="mt-6 text-red-800 dark:text-red-300">{error}</p>}
      {answer && <p className="mt-6 whitespace-pre-wrap rounded-xl border border-neutral-300 p-5 dark:border-neutral-700">{answer}</p>}
    </div>
  );
}
