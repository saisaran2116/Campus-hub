"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import EventPhoto from "@/components/EventPhoto";
import SaveEventButton from "@/components/SaveEventButton";
import TestCheckoutButton from "@/components/TestCheckoutButton";
import type { EventCardData } from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";

type EventDetails = EventCardData & { testCheckoutAvailable?: boolean; hasTicket?: boolean };
const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" });

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id;
  const [event, setEvent] = useState<EventDetails>();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError("");
    setSaved(false);
    async function load() {
      try {
        const [response, schedule] = await Promise.all([
          fetch(`/api/events/${encodeURIComponent(id)}`, { signal }),
          userId ? fetch("/api/saved", { signal }).catch(() => null) : null,
        ]);
        if (!response.ok) throw new Error(response.status === 404 ? "This event could not be found." : "This event could not be opened.");
        const data = await response.json();
        const items = schedule?.ok ? (await schedule.json()).events : [];
        if (signal.aborted) return;
        setEvent(data.event);
        setSaved(items.some((item: { id: string }) => item.id === id));
      } catch (failure) {
        if (!signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the event.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id, userId, revision]);

  const registration = event?.registrationUrl;
  const date = event ? new Date(event.date) : null;
  const dateLabel = date && !Number.isNaN(date.valueOf()) ? dateFormat.format(date) : event?.date;

  return (
    <div className="site-width py-8 sm:py-12">
      <Link href="/events" className="site-link inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={17} aria-hidden="true" /> All events
      </Link>
      {loading ? (
        <div className="site-surface mt-6 p-6" role="status">Loading event…</div>
      ) : error || !event ? (
        <div className="site-surface mt-6 p-6">
          <p role="alert">{error || "Could not load the event."}</p>
          <button onClick={() => setRevision((current) => current + 1)} className="btn site-secondary mt-3">Try again</button>
        </div>
      ) : (
        <>
          <header className="mt-6 grid items-center gap-6 border-b border-stone-200 pb-8 dark:border-stone-800 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="site-link text-sm font-semibold">{event.category}{event.status !== "APPROVED" && ` · ${event.status.toLowerCase()}`}</p>
              <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">{event.title}</h1>
              <p className="site-muted mt-3">Hosted by {event.organizerName || event.organizer?.name || "Campus club"}</p>
              {event.summary && event.summary !== event.description && <p className="site-muted mt-4 max-w-xl text-pretty text-lg">{event.summary}</p>}
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-800">
              <EventPhoto posterUrl={event.posterUrl} category={event.category} className="size-full object-cover" />
            </div>
          </header>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_350px]">
            <div>
              <h2 className="text-balance text-2xl font-semibold">About this event</h2>
              <p className="site-muted mt-3 whitespace-pre-line text-pretty leading-relaxed">{event.description || event.summary}</p>
              {event.contactInfo && !["Not specified", "Needs verification"].includes(event.contactInfo) && (
                <p className="site-muted mt-6 break-words"><strong>Contact</strong> · {event.contactInfo}</p>
              )}
            </div>
            <aside className="site-surface p-5 sm:p-6" aria-label="Event information">
              <h2 className="text-xl font-semibold">When and where</h2>
              <dl className="site-muted mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2"><dt><CalendarDays size={18} aria-label="Date" /></dt><dd><time dateTime={event.date}>{dateLabel}</time></dd></div>
                <div className="flex items-center gap-2 tabular-nums"><dt><Clock size={18} aria-label="Time" /></dt><dd>{event.startTime} – {event.endTime}</dd></div>
                <div className="flex items-start gap-2"><dt><MapPin size={18} aria-label="Location" /></dt><dd>{event.venue}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
                {registration && /^https?:\/\//i.test(registration) && (
                  <a href={registration} target="_blank" rel="noopener noreferrer" className="btn site-primary">
                    Register <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
                {event.testCheckoutAvailable && user && <TestCheckoutButton eventId={id} hasTicket={!!event.hasTicket} />}
                {event.status === "APPROVED" && <SaveEventButton eventId={id} title={event.title} saved={saved} onChange={setSaved} />}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
