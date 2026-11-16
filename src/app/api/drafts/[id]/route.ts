import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth";
import { draftInput, draftsCollection } from "@/lib/drafts";

async function handleDraft(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(request, ["ORGANIZER", "CAMPUS_MANAGER"]);
  if ("errorResponse" in auth) return auth.errorResponse;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid draft ID." }, { status: 400 });
  }

  const ownerFilter = { _id: new ObjectId(id), organizerId: auth.user.userId };
  const notFound = () => NextResponse.json({ error: "Draft not found." }, { status: 404 });

  try {
    const collection = await draftsCollection();
    if (request.method === "DELETE") {
      const deleted = await collection.deleteOne(ownerFilter);
      return deleted.deletedCount ? new NextResponse(null, { status: 204 }) : notFound();
    }

    if (request.method === "GET") {
      const draft = await collection.findOne(ownerFilter);
      return draft ? NextResponse.json(draft) : notFound();
    }

    const parsed = draftInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a draft title and valid notes." }, { status: 400 });
    const draft = await collection.findOneAndUpdate(ownerFilter,
      { $set: { content: parsed.data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return draft ? NextResponse.json(draft) : notFound();
  } catch (error) {
    console.error("Draft operation failed", error);
    return NextResponse.json({ error: "Drafts are temporarily unavailable." }, { status: 503 });
  }
}

export { handleDraft as GET, handleDraft as PUT, handleDraft as DELETE };
