import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getRedis } from "@/lib/redis";
import { formatLocalDate } from "@/lib/time";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ["CAMPUS_MANAGER"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const { user } = authResult;
    const decision = z.object({
      eventId: z.string().min(1),
      action: z.enum(["APPROVE", "DECLINE"]),
      corrections: z.object({
        title: z.string().trim().max(240).optional(),
        date: z.union([z.literal(""), z.string().date()]).optional(),
        startTime: z.string().trim().max(30).optional(),
        endTime: z.string().trim().max(30).optional(),
        venue: z.string().trim().max(240).optional(),
        organizerName: z.string().trim().max(240).optional(),
        category: z.string().trim().max(240).optional(),
        description: z.string().trim().max(5000).optional(),
        summary: z.string().trim().max(5000).optional(),
      }).optional(),
      reason: z.string().trim().max(500).nullish(),
      customNotes: z.string().trim().max(5000).nullish(),
    }).safeParse(await req.json().catch(() => null));
    if (!decision.success) {
      return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
    }
    const { eventId, action, corrections, reason, customNotes } = decision.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // State Machine Guard: Only events with PENDING status can be verified/declined
    if (event.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Event cannot be processed because its status is already '${event.status}'. Only PENDING events can be reviewed.`,
        },
        { status: 409 }
      );
    }

    const now = new Date();

    if (action === "APPROVE") {
      // Apply manager corrections if any
      const updateData: Prisma.EventUncheckedUpdateInput = {
        status: "APPROVED",
        verifiedById: user.userId,
        verifiedAt: now,
        declineReason: null,
        declineCustomNotes: null,
      };

      if (corrections) {
        if (corrections.title) updateData.title = corrections.title.trim();
        if (corrections.date) updateData.date = corrections.date.trim();
        if (corrections.startTime) updateData.startTime = corrections.startTime.trim();
        if (corrections.endTime) updateData.endTime = corrections.endTime.trim();
        if (corrections.venue) updateData.venue = corrections.venue.trim();
        if (corrections.organizerName) updateData.organizerName = corrections.organizerName.trim();
        if (corrections.category) updateData.category = corrections.category.trim();
        if (corrections.description) updateData.description = corrections.description.trim();
        if (corrections.summary) updateData.summary = corrections.summary.trim();
      }

      const [updated] = await prisma.$transaction([
        prisma.event.update({
          where: { id: eventId, status: "PENDING" },
          data: updateData,
        }),
        prisma.approvalHistory.create({
          data: {
            eventId,
            managerId: user.userId,
            action: "APPROVED",
            notes: customNotes || "Verified against original event poster.",
            timestamp: now,
          },
        }),
      ]);

      const redis = await getRedis();
      await redis?.multi()
        .del(`campus:upcoming:${formatLocalDate(new Date())}`)
        .publish("campus:catalogue-changed", "approved")
        .exec().catch(() => undefined);

      return NextResponse.json({
        success: true,
        message: "Event approved successfully. Stamped with ✓ CAMPUS VERIFIED.",
        event: updated,
      });
    } else {
      // DECLINE action
      const declineReasonText = reason || "Information doesn't match poster";

      const [updated] = await prisma.$transaction([
        prisma.event.update({
          where: { id: eventId, status: "PENDING" },
          data: {
            status: "DECLINED",
            declineReason: declineReasonText,
            declineCustomNotes: customNotes || "Event information could not be verified.",
            verifiedById: user.userId,
            verifiedAt: now,
          },
        }),
        prisma.approvalHistory.create({
          data: {
            eventId,
            managerId: user.userId,
            action: "DECLINED",
            reason: declineReasonText,
            notes: customNotes || "Declined by Campus Manager",
            timestamp: now,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Event has been declined.",
        event: updated,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "This event has already been reviewed." }, { status: 409 });
    }
    console.error("Manager verify action error:", error);
    return NextResponse.json(
      { error: "Failed to process verification decision." },
      { status: 500 }
    );
  }
}
