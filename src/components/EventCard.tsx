import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import EventPhoto from "./EventPhoto";
import SaveEventButton from "./SaveEventButton";
import { getHumanCountdown } from "@/lib/time";

export interface EventCardData {
  id: string;
  title: string;
  summary: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  organizerName?: string | null;
  posterUrl: string;
  category: string;
  status: string;
  isSaved?: boolean;
  description?: string;
  tags?: string;
  registrationUrl?: string | null;
  contactInfo?: string | null;
  organizer?: {
    name: string;
    avatar?: string | null;
  };
}

export default function EventCard({ event, onSaveToggle }: {
  event: EventCardData;
  onSaveToggle: (eventId: string, saved: boolean) => void;
}) {
  const href = `/events/${event.id}`;

  return (
    <article className="site-surface event-card flex h-full flex-col overflow-hidden">
      <div className="aspect-[2/1] overflow-hidden bg-stone-200 dark:bg-stone-800">
        <EventPhoto posterUrl={event.posterUrl} category={event.category} className="size-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="site-link text-sm font-medium">{event.category}</span>
        <h2 className="mt-1 text-balance text-2xl font-semibold">
          <Link href={href} className="hover:underline">{event.title}</Link>
        </h2>
        <ul className="site-muted my-4 space-y-2 text-sm">
          <li className="flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" />{getHumanCountdown(event.date, event.startTime)}</li>
          <li className="flex items-center gap-2 tabular-nums"><Clock size={16} aria-hidden="true" />{event.startTime} – {event.endTime}</li>
          <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{event.venue}</li>
        </ul>
        <p className="site-muted mb-5 line-clamp-2 text-sm leading-relaxed">{event.summary}</p>
        <div className="mt-auto flex items-start justify-between gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <Link href={href} aria-label={`Details for ${event.title}`} className="site-link inline-flex items-center gap-1 py-1 text-sm font-semibold">
            View event
          </Link>
          {event.status === "APPROVED" && <SaveEventButton eventId={event.id} title={event.title} compact
            saved={!!event.isSaved} onChange={(saved) => onSaveToggle(event.id, saved)} />}
        </div>
      </div>
    </article>
  );
}
