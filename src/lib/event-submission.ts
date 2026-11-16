import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, sanitizeUrl } from "@/lib/auth";

const requiredField = z.string().trim().min(1).max(240);
const optionalText = z.string().max(5000).optional();
const submission = z.object({
  title: requiredField,
  date: z.string().date(),
  startTime: requiredField,
  endTime: requiredField,
  venue: requiredField,
  category: requiredField,
  description: optionalText,
  summary: optionalText,
  organizerName: optionalText,
  posterUrl: z.string().max(8 * 1024 * 1024 + 28).optional(),
  tags: z.union([z.string().max(5000), z.array(z.string().max(100)).max(20)]).optional(),
  registrationUrl: optionalText,
  contactInfo: optionalText,
  confidences: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  duplicatesDetected: z.unknown().optional(),
});

export async function submitEvent(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ["ORGANIZER", "CAMPUS_MANAGER"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const { user } = authResult;
    const input: unknown = await req.json().catch(() => null);
    const poster = input && typeof input === "object" && "posterUrl" in input ? input.posterUrl : null;
    if (typeof poster === "string" && poster.length > 8 * 1024 * 1024 + 28) {
      return NextResponse.json({ error: "Poster exceeds the 6 MB limit." }, { status: 413 });
    }
    const parsed = submission.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: `${issue.path.join(".") || "Request"}: ${issue.message}` }, { status: 400 });
    }
    const body = parsed.data;

    const {
      title,
      description,
      summary,
      date,
      startTime,
      endTime,
      venue,
      organizerName,
      posterUrl,
      category,
      tags,
      registrationUrl,
      contactInfo,
      confidences,
      duplicatesDetected,
    } = body;

    // Default fallback poster if none provided, and sanitize against dangerous protocols
    const defaultPoster = "/images/campus-life.jpg";
    const isImage = posterUrl && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(posterUrl);
    const resolvedPoster = isImage ? posterUrl : sanitizeUrl(posterUrl, defaultPoster);

    const safeDescription = (description || "").trim();
    const resolvedSummary =
      summary && summary.trim().length > 0
        ? summary.trim()
        : safeDescription.substring(0, 150) + "...";

    const formattedTags = Array.isArray(tags)
      ? tags.join(", ")
      : typeof tags === "string"
      ? tags
      : "Campus Event";

    const safeRegistrationUrl = sanitizeUrl(registrationUrl, "Not specified");

    // Clean audit snapshot so multi-megabyte base64 strings aren't duplicated into SQLite text columns
    const auditSnapshot = { ...body };
    if (
      auditSnapshot.posterUrl &&
      typeof auditSnapshot.posterUrl === "string" &&
      auditSnapshot.posterUrl.startsWith("data:")
    ) {
      auditSnapshot.posterUrl = `[base64-image-data-length-${auditSnapshot.posterUrl.length}]`;
    }

    // Atomically create event and analysis record
    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: safeDescription,
        summary: resolvedSummary,
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        venue: venue.trim(),
        organizerName: organizerName ? organizerName.trim() : user.name,
        posterUrl: resolvedPoster,
        category: category.trim(),
        tags: formattedTags,
        registrationUrl: safeRegistrationUrl,
        contactInfo: contactInfo ? contactInfo.trim() : user.email,
        status: "PENDING", // Enforce pending status
        organizerId: user.userId,
        analyses: {
          create: {
            rawExtractedData: JSON.stringify(auditSnapshot),
            confidenceData: JSON.stringify(confidences || {}),
            duplicatesDetected: duplicatesDetected ? JSON.stringify(duplicatesDetected) : null,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event submitted successfully for Campus Manager verification.",
      event,
    }, { status: 201, headers: { Location: `/api/events/${event.id}` } });
  } catch (error) {
    console.error("Submit event error:", error);
    return NextResponse.json(
      { error: "Failed to submit event. Please check your data and try again." },
      { status: 500 }
    );
  }
}
