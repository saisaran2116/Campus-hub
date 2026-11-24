import { MongoClient, MongoServerError } from "mongodb";
import { draftValidator, type EventDraft } from "./event-draft.model";

export { draftInput, draftValidator } from "./event-draft.model";

async function openDrafts() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI to enable organizer drafts.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    const db = client.db();
    try {
      await db.createCollection("eventDrafts", { validator: draftValidator });
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 48) throw error;
      await db.command({ collMod: "eventDrafts", validator: draftValidator, validationLevel: "strict" });
    }
    const drafts = db.collection<EventDraft>("eventDrafts");
    await drafts.createIndex({ organizerId: 1, updatedAt: -1 });
    return drafts;
  } catch (error) {
    await client.close();
    throw error;
  }
}

let collection: ReturnType<typeof openDrafts> | undefined;

export function draftsCollection() {
  collection ??= openDrafts().catch((error) => {
    collection = undefined;
    throw error;
  });
  return collection;
}
