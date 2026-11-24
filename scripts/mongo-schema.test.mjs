import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { draftInput, draftValidator } from "../src/lib/drafts.ts";

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
