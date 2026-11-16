import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { getUpcomingEvents } from "@/lib/upcoming-events";
import EventPhoto from "@/components/EventPhoto";

export const dynamic = "force-dynamic";

const eventDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", weekday: "short", timeZone: "UTC",
});

export default async function LandingPage() {
  const events = await getUpcomingEvents().catch(() => null);

  return (
    <>
      <section className="border-b border-stone-200 dark:border-stone-800">
        <div className="site-width grid gap-8 py-9 sm:py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12">
          <div className="py-3 lg:py-8">
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
              <CalendarDays size={16} aria-hidden="true" /> Campus events
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Find your next campus event.
            </h1>
            <p className="site-muted mt-5 max-w-md text-pretty text-lg leading-relaxed">
              Discover workshops, screenings and club meetups. Save your plans in one place and see when events overlap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/events" className="btn site-primary">
                Browse events <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/events/create" className="btn site-secondary">Submit an event</Link>
            </div>
          </div>
          <div className="relative aspect-[5/3] overflow-hidden rounded-2xl bg-stone-200 sm:aspect-[3/2] dark:bg-stone-800">
            <Image src="/images/campus-life.jpg" fill preload sizes="(min-width: 1024px) 640px, 94vw"
              className="object-cover object-center" alt="Students chatting and studying on outdoor campus steps" />
          </div>
        </div>
      </section>

      <section aria-labelledby="upcoming-heading" className="site-width py-10 sm:py-13">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="upcoming-heading" className="text-balance text-3xl font-semibold">Upcoming events</h2>
          <Link className="site-link inline-flex items-center gap-2 py-1 font-semibold" href="/events">
            View upcoming events <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        {events?.length ? (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="site-surface group block h-full overflow-hidden hover:border-rose-700 dark:hover:border-rose-400">
                  <div className="aspect-[2/1] overflow-hidden bg-stone-200 dark:bg-stone-800">
                    <EventPhoto posterUrl={event.posterUrl} category={event.category} className="size-full object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <time className="site-link font-semibold" dateTime={event.date}>{eventDate.format(new Date(event.date))}</time>
                      <span className="site-muted">{event.category}</span>
                    </div>
                    <h3 className="mt-2 text-balance text-xl font-semibold group-hover:underline">{event.title}</h3>
                    <p className="site-muted mt-3 flex items-start gap-2 text-sm"><MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{event.venue}</p>
                    <p className="site-muted mt-1 text-sm">{event.organizer}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="site-surface site-muted mt-5 p-5">
            {events ? "No upcoming events are listed yet." : "Upcoming events are temporarily unavailable."}
          </p>
        )}
      </section>
    </>
  );
}
