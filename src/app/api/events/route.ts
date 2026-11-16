import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseTimeToMinutes } from "@/lib/clash";
import { formatLocalDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const venue = searchParams.get("venue")?.trim() || "";
    const dateFilter = searchParams.get("dateFilter")?.trim() || ""; // "TODAY" | "TOMORROW" | "THIS_WEEK" | "UPCOMING"
    const sortBy = searchParams.get("sortBy") || "soonest"; // "soonest" | "latest" | "recently_added"

    // Reference date in local campus time
    const now = new Date();
    const todayStr = formatLocalDate(now);

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = formatLocalDate(nextWeek);

    // Build Prisma query condition
    const where: Prisma.EventWhereInput = {
      status: "APPROVED", // Mandatory security rule: ONLY APPROVED events are public
    };

    if (category && category !== "ALL") {
      where.category = { equals: category };
    }

    if (venue && venue !== "ALL") {
      where.venue = { contains: venue, mode: "insensitive" };
    }

    if (dateFilter === "TODAY") {
      where.date = todayStr;
    } else if (dateFilter === "TOMORROW") {
      where.date = tomorrowStr;
    } else if (dateFilter === "THIS_WEEK") {
      where.date = {
        gte: todayStr,
        lte: nextWeekStr,
      };
    } else if (dateFilter === "UPCOMING") {
      where.date = {
        gte: todayStr,
      };
    }

    const pageParam = parseInt(searchParams.get("page") || "", 10);
    const limitParam = parseInt(searchParams.get("limit") || "", 10);
    const hasPagination = !isNaN(limitParam) && limitParam > 0;
    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = hasPagination ? Math.min(100, Math.max(1, limitParam)) : 100;

    // Push text search down to SQL if query parameter exists
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { organizerName: { contains: query, mode: "insensitive" } },
        { venue: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { tags: { contains: query, mode: "insensitive" } },
        { organizer: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    // Fetch matching approved events
    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy:
        sortBy === "recently_added"
          ? { createdAt: "desc" }
          : sortBy === "latest"
          ? { date: "desc" }
          : { date: "asc" },
    });

    // Sort by soonest (date + startTime)
    if (sortBy === "soonest") {
      events.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        const minA = parseTimeToMinutes(a.startTime);
        const minB = parseTimeToMinutes(b.startTime);
        const safeA = isNaN(minA) ? 9999 : minA;
        const safeB = isNaN(minB) ? 9999 : minB;
        return safeA - safeB;
      });
    }

    const totalCount = events.length;
    const paginatedEvents = hasPagination
      ? events.slice((page - 1) * limit, page * limit)
      : events;

    return NextResponse.json({
      success: true,
      count: paginatedEvents.length,
      totalCount,
      page: hasPagination ? page : 1,
      totalPages: hasPagination ? Math.ceil(totalCount / limit) : 1,
      events: paginatedEvents,
    });
  } catch (error) {
    console.error("Public events query error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campus events." },
      { status: 500 }
    );
  }
}

export { submitEvent as POST } from "@/lib/event-submission";
