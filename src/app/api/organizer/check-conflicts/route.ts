import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { detectDuplicateEvent } from "@/lib/event-duplicates";
import { checkTwoEventsClash, nearbyDates } from "@/lib/clash";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ["ORGANIZER", "CAMPUS_MANAGER"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const input = z.object({
      title: z.string().max(240),
      date: z.string().date(),
      startTime: z.string().max(30),
      endTime: z.string().max(30).optional(),
      venue: z.string().max(240),
    }).safeParse(await req.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Invalid event details." }, { status: 400 });
    const { title, date, startTime, endTime, venue } = input.data;

    // Check 1: Duplicate title or exact same start time at venue
    const duplicateCheck = await detectDuplicateEvent(title, date, startTime, venue);
    if (duplicateCheck.hasPotentialDuplicate) {
      return NextResponse.json({
        hasConflict: true,
        type: "DUPLICATE",
        reason: duplicateCheck.reason,
        matchedEvent: duplicateCheck.matchedEvent,
      });
    }

    // Check 2: Venue schedule collision (overlapping time slots at same venue)
    if (venue && venue.trim() !== "Not specified" && startTime && endTime) {
      const nearbyVenueEvents = await prisma.event.findMany({
        where: {
          date: { in: nearbyDates(date) },
          status: { in: ["APPROVED", "PENDING"] },
        },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          venue: true,
        },
      });

      const targetSlot = {
        title: title || "New Event",
        date,
        startTime,
        endTime,
        venue,
      };

      for (const existing of nearbyVenueEvents) {
        // Compare venue similarity
        const vA = venue.toLowerCase().trim();
        const vB = existing.venue.toLowerCase().trim();
        const sameVenue = vA === vB || vA.includes(vB) || vB.includes(vA);

        if (sameVenue) {
          const clash = checkTwoEventsClash(targetSlot, existing);
          if (clash.hasClash && clash.overlap) {
            return NextResponse.json({
              hasConflict: true,
              type: "VENUE_CLASH",
              reason: `Venue collision: '${existing.title}' is already scheduled at '${existing.venue}' during ${clash.overlap.formatted}.`,
              overlap: clash.overlap,
              matchedEvent: existing,
            });
          }
        }
      }
    }

    return NextResponse.json({
      hasConflict: false,
    });
  } catch (error) {
    console.error("Organizer check-conflicts error:", error);
    return NextResponse.json({ error: "Unable to check for event conflicts." }, { status: 500 });
  }
}
