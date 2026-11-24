import { prisma } from "./prisma";
import { getRedis } from "./redis";
import { formatLocalDate } from "./time";

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  category: string;
  organizer: string;
  posterUrl?: string;
}

export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  const date = formatLocalDate(new Date());
  const key = `campus:upcoming:${date}`;
  const redis = await getRedis();
  const cached = await redis?.get(key).catch(() => null);
  if (cached) return JSON.parse(cached) as UpcomingEvent[];

  const events = await prisma.$queryRaw<UpcomingEvent[]>`
    SELECT e.id, e.title, e.date, e.venue, e.category, e."posterUrl", u.name AS organizer
      FROM "Event" e
      INNER JOIN "User" u ON u.id = e."organizerId"
     WHERE e.status = 'APPROVED' AND e.date >= ${date}
     ORDER BY e.date, e.id
     LIMIT 3
  `;
  await redis?.set(key, JSON.stringify(events), { EX: 30 }).catch(() => undefined);
  return events;
}
