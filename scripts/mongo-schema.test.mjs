import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { draftInput, draftValidator } from "../src/lib/event-draft.model.ts";

test("Mongo schema boundary validates and normalizes draft content", () => {
  assert.deepEqual(draftInput.parse({ title: " Workshop ", notes: " Notes " }), {
    title: "Workshop", notes: "Notes",
  });
  assert.equal(draftInput.safeParse({ title: "", notes: "" }).success, false);
  assert.equal(draftInput.safeParse({ title: "Test", notes: "x".repeat(5001) }).success, false);
});

test("MongoDB enforces the production document schema on inserts and updates", {
  skip: !process.env.MONGODB_URI,
}, async () => {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  let collection;
  try {
    await client.connect();
    collection = await client.db().createCollection(
      `schema_test_${new ObjectId()}`, { validator: draftValidator },
    );
    const draft = {
      _id: new ObjectId(), organizerId: "schema-test",
      content: { title: "Workshop", notes: "" }, updatedAt: new Date(),
    };
    await collection.insertOne(draft);
    // Embedding vs referencing and indexing use the same fields as the API.
    await collection.createIndex({ organizerId: 1, updatedAt: -1 });
    const ownDrafts = await collection.find({ organizerId: "schema-test" })
      .sort({ updatedAt: -1 }).hint({ organizerId: 1, updatedAt: -1 }).toArray();
    assert.equal(ownDrafts[0].content.title, "Workshop");
    assert.equal(ownDrafts[0].organizerId, "schema-test");
    assert.equal(await collection.countDocuments({ organizerId: "another-organizer" }), 0);
    await assert.rejects(collection.insertOne({
      ...draft, _id: new ObjectId(), updatedAt: "invalid date",
    }), { code: 121 });
    await assert.rejects(collection.updateOne({ _id: draft._id }, {
      $set: { "content.title": "" },
    }), { code: 121 });
    assert.equal((await collection.findOne({ _id: draft._id })).content.title, "Workshop");
  } finally {
    if (collection) await collection.drop();
    await client.close();
  }
});
