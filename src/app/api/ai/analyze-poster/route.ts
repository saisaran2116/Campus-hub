import { detectDuplicateEvent } from "@/lib/event-duplicates";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeEventPoster, PosterAnalysisUnavailable } from "@/lib/ai-poster-analyzer";
import { SAMPLE_POSTERS } from "@/lib/poster-samples";
import { withinRateLimit } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";

const analysisRequest = z.object({
  sampleId: z.string().optional(),
  imageData: z.string().optional(),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ORGANIZER", "CAMPUS_MANAGER"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = analysisRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Submit a valid poster image or sample." }, { status: 400 });
  }

  const { sampleId, imageData, mimeType } = parsed.data;
  if (imageData && imageData.length > 8 * 1024 * 1024 + 24) {
    return NextResponse.json({ error: "Poster exceeds the 6 MB limit." }, { status: 413 });
  }
  const sample = sampleId && SAMPLE_POSTERS.some(({ id }) => id === sampleId);
  const imageMatch = imageData?.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (sampleId ? !sample : !imageMatch || (mimeType && mimeType !== imageMatch[1])) {
    return NextResponse.json({ error: "Select a sample or upload a PNG, JPEG, WebP, or GIF poster." }, { status: 400 });
  }

  try {
    if (!sample && process.env.REDIS_URL && !await withinRateLimit("poster", auth.user.userId, 8)) {
      return NextResponse.json({ error: "Poster analysis limit reached. Try again in a minute." }, {
        status: 429, headers: { "Retry-After": "60" },
      });
    }

    const extractedData = await analyzeEventPoster(imageData ?? "", imageMatch?.[1] ?? "image/png", sampleId);
    const { title, date, startTime, venue } = extractedData;
    const duplicateCheck = await detectDuplicateEvent(title, date, startTime, venue);
    return NextResponse.json({ success: true, extractedData, duplicateCheck });
  } catch (error) {
    if (error instanceof PosterAnalysisUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Poster analysis failed", error);
    return NextResponse.json({ error: "Unable to analyze the poster." }, { status: 500 });
  }
}
