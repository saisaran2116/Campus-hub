import type { ObjectId } from "mongodb";
import { z } from "zod";

export const draftInput = z.object({
  title: z.string().trim().min(1).max(240),
  notes: z.string().trim().max(5000),
});

// Mongo schema modeling: embedded content and a reference to the SQL organizer.
export interface EventDraft {
  _id: ObjectId;
  organizerId: string;
  content: z.infer<typeof draftInput>;
  updatedAt: Date;
}

// Enforced by MongoDB on inserts and updates, including writes outside this API.
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
