import { prisma } from "./prisma";
import { parseTimeToMinutes } from "./clash";

export interface DuplicateCheckResult {
  hasPotentialDuplicate: boolean;
  matchedEvent?: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    venue: string;
    organizerName?: string | null;
  };
  reason?: string;
}

/**
 * Checks existing database events for potential duplicates.
 * Criteria:
 *  - Matching date AND venue
 *  - OR matching date AND overlapping time AND similar title
 */
export async function detectDuplicateEvent(
  title: string,
  date: string,
  startTime: string,
  venue: string
): Promise<DuplicateCheckResult> {
  try {
    const normTargetTitle = normalizeForComparison(title);
    const targetStartMin = parseTimeToMinutes(startTime);

    const existingEvents = await prisma.event.findMany({
      where: {
        date: date,
        status: { in: ["APPROVED", "PENDING"] },
      },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        venue: true,
        organizerName: true,
      },
    });

    for (const event of existingEvents) {
      const normExistingTitle = normalizeForComparison(event.title);
      const sameVenue =
        venue &&
        event.venue &&
        venue.trim() !== "Not specified" &&
        (venue.toLowerCase().includes(event.venue.toLowerCase()) ||
          event.venue.toLowerCase().includes(venue.toLowerCase()));

      const exactTitleMatch = normTargetTitle === normExistingTitle;
      const isSubstantialSubstring =
        (normTargetTitle.length >= 15 && normExistingTitle.includes(normTargetTitle)) ||
        (normExistingTitle.length >= 15 && normTargetTitle.includes(normExistingTitle));
      const titleSimilarity = calculateTitleSimilarity(title, event.title);

      const similarTitle =
        exactTitleMatch ||
        isSubstantialSubstring ||
        titleSimilarity >= 0.75;

      if (similarTitle && event.date === date) {
        return {
          hasPotentialDuplicate: true,
          matchedEvent: event,
          reason: `Found an existing event '${event.title}' on the same date (${date}) with a matching or highly similar title.`,
        };
      }

      const existingStartMin = parseTimeToMinutes(event.startTime);
      const timesMatch =
        !isNaN(targetStartMin) &&
        !isNaN(existingStartMin) &&
        targetStartMin === existingStartMin;

      if (sameVenue && event.date === date && timesMatch) {
        return {
          hasPotentialDuplicate: true,
          matchedEvent: event,
          reason: `Another event '${event.title}' is already scheduled at '${event.venue}' at ${event.startTime}.`,
        };
      }
    }

    return { hasPotentialDuplicate: false };
  } catch (error) {
    console.error("Duplicate check error:", error);
    return { hasPotentialDuplicate: false };
  }
}

function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function calculateTitleSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForComparison(str1);
  const norm2 = normalizeForComparison(str2);
  if (norm1 === norm2) return 1.0;

  const words1 = new Set(norm1.split(" ").filter((w) => w.length > 2));
  const words2 = new Set(norm2.split(" ").filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((word) => {
    if (words2.has(word)) intersection++;
  });
  return (2 * intersection) / (words1.size + words2.size);
}
