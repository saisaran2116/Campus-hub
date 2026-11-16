import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { streamEventSuggestions } from "@/lib/event-assistant";
import { getRedis, withinRateLimit } from "@/lib/redis";

const input = z.object({ question: z.string().trim().min(3).max(600) });

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Enter a question between 3 and 600 characters." }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || !await getRedis()) {
    return NextResponse.json({ error: "Event suggestions are unavailable." }, { status: 503 });
  }

  try {
    if (!await withinRateLimit("suggestions", auth.user.userId, 4)) {
      return NextResponse.json({ error: "Try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
    }
    return await streamEventSuggestions(body.data.question, key, request.signal);
  } catch (error) {
    console.warn("Event suggestions failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Unable to suggest events right now." }, { status: 503 });
  }
}
