import { MongoClient, MongoServerError, ObjectId } from "mongodb";
import { z } from "zod";

export const draftInput = z.object({
  title: z.string().trim().min(1).max(240),
  notes: z.string().trim().max(5000),
});

interface Draft {
  _id: ObjectId;
  organizerId: string;
  content: z.infer<typeof draftInput>;
  updatedAt: Date;
}

export const draftValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "organizerId", "content", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      organizerId: { bsonType: "string", minLength: 1 },
      content: {
        bsonType: "object",
        required: ["title", "notes"],
        additionalProperties: false,
        properties: {
          title: { bsonType: "string", minLength: 1, maxLength: 240 },
          notes: { bsonType: "string", maxLength: 5000 },
        },
      },
      updatedAt: { bsonType: "date" },
    },
  },
};

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
    const drafts = db.collection<Draft>("eventDrafts");
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
