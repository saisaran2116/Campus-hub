import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth";
import { draftInput, draftsCollection } from "@/lib/drafts";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ORGANIZER", "CAMPUS_MANAGER"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const collection = await draftsCollection();
    const [result] = await collection.aggregate([
      { $match: { organizerId: auth.user.userId } },
      { $facet: {
        drafts: [{ $sort: { updatedAt: -1 } }, { $limit: 50 }],
        total: [{ $count: "count" }],
      } },
    ]).toArray();
    return NextResponse.json({ drafts: result?.drafts ?? [], total: result?.total[0]?.count ?? 0 });
  } catch (error) {
    console.error("Reading drafts failed", error);
    return NextResponse.json({ error: "Drafts are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ORGANIZER", "CAMPUS_MANAGER"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = draftInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a draft title and valid notes." }, { status: 400 });

  try {
    const draft = { _id: new ObjectId(), organizerId: auth.user.userId, content: parsed.data, updatedAt: new Date() };
    await (await draftsCollection()).insertOne(draft);
    return NextResponse.json(draft, { status: 201, headers: { Location: `/api/drafts/${draft._id}` } });
  } catch (error) {
    console.error("Creating draft failed", error);
    return NextResponse.json({ error: "Drafts are temporarily unavailable." }, { status: 503 });
  }
}
