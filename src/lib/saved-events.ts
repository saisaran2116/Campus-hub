import type { Event } from "@prisma/client";
import { prisma } from "./prisma";

type SavedScheduleEvent = Event & {
  organizer: { name: string; email: string };
  verifiedBy: { name: string } | null;
};

// SQL JOINs combine the junction table, events, owners and optional reviewers.
// Template interpolation binds userId as a parameter instead of SQL text.
export async function getSavedEvents(userId: string): Promise<SavedScheduleEvent[]> {
  return prisma.$queryRaw<SavedScheduleEvent[]> `
    SELECT e.*,
           json_build_object('name', organizer.name, 'email', organizer.email) AS organizer,
           CASE WHEN reviewer.id IS NULL THEN NULL
                ELSE json_build_object('name', reviewer.name) END AS "verifiedBy"
      FROM "SavedEvent" saved
      INNER JOIN "Event" e ON e.id = saved."eventId"
      INNER JOIN "User" organizer ON organizer.id = e."organizerId"
      LEFT JOIN "User" reviewer ON reviewer.id = e."verifiedById"
     WHERE saved."userId" = ${userId}
     ORDER BY e.date, e.id
  `;
}
