import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Bookmark, ShieldCheck } from "lucide-react";
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
      <section className="landing-hero border-b border-stone-200">
        <div className="site-width grid gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="py-3 lg:py-8">
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
              <CalendarDays size={16} aria-hidden="true" /> Made for campus life
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Your campus.<br />Your people.<br /><span className="text-[#D02020]">Your next plan.</span>
            </h1>
            <p className="site-muted mt-5 max-w-md text-pretty text-lg leading-relaxed">
              Discover workshops, screenings and club meetups. Save your plans in one place and see when events overlap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/events" className="btn site-primary">
                Explore events
              </Link>
              <Link href="/events/create" className="btn site-secondary">Host an event</Link>
            </div>
          </div>
          <div className="landing-photo overflow-hidden"><div className="relative aspect-[4/3]">
            <Image
              src="/images/campus-life.jpg"
              alt="Students chatting and studying on outdoor campus steps"
              fill
              preload
              sizes="(min-width: 1024px) 640px, 94vw"
              className="object-cover"
            />
          </div><div className="landing-caption flex items-center justify-between gap-4 text-sm"><span>Good things happen beyond the classroom.</span><CalendarDays size={20} aria-hidden="true" /></div></div>
        </div>
      </section>

      <div className="border-b border-stone-200 bg-white"><div className="site-width grid gap-6 py-6 sm:grid-cols-3">
        {[{ icon: ShieldCheck, title: "Campus-approved", text: "Events reviewed by your campus team." }, { icon: Bookmark, title: "A schedule that’s yours", text: "Save events and keep your plans together." }, { icon: CalendarDays, title: "Fewer clashes", text: "See when your saved events overlap." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-3"><Icon size={21} className="mt-1 shrink-0 text-[#D02020]" aria-hidden="true" /><div><p className="font-semibold">{title}</p><p className="site-muted mt-1 text-sm">{text}</p></div></div>)}
      </div></div>
      <section aria-labelledby="upcoming-heading" className="site-width py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="upcoming-heading" className="text-balance text-3xl font-semibold">Upcoming events</h2>
          <Link className="site-link inline-flex items-center gap-2 py-1 font-semibold" href="/events">
            View all events
          </Link>
        </div>
        {events?.length ? (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="site-surface event-card group block h-full overflow-hidden hover:border-rose-700 dark:hover:border-rose-400">
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
          <div className="site-surface mt-6 p-8 text-center"><CalendarDays className="mx-auto mb-3 text-stone-500" aria-hidden="true" /><h3 className="text-lg font-semibold">{events ? "Your next plan is on its way" : "We couldn’t load upcoming events"}</h3><p className="site-muted mt-2">{events ? "Check back for new events from your campus clubs." : "Try the event catalogue again in a moment."}</p><Link href="/events" className="btn site-secondary mt-5">Open event catalogue</Link></div>
        )}
      </section>
    </>
  );
}
