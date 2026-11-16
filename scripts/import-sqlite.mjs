// Run with Node 22+ after initializing an empty PostgreSQL database.
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

if (!process.argv[2]) throw new Error("Pass the path to the existing SQLite database.");
const source = new DatabaseSync(process.argv[2], { readOnly: true });
const target = new PrismaClient();
const models = {
  User: ["createdAt"],
  Event: ["verifiedAt", "createdAt", "updatedAt"],
  SavedEvent: ["savedAt"],
  EventAnalysis: ["analyzedAt"],
  ApprovalHistory: ["timestamp"],
};

try {
  await target.$transaction(async (tx) => {
    for (const [model, dateFields] of Object.entries(models)) {
      const delegate = tx[model[0].toLowerCase() + model.slice(1)];
      if (await delegate.count()) throw new Error("Import requires an empty PostgreSQL database.");
      const data = source.prepare(`SELECT * FROM "${model}"`).all().map((row) => {
        for (const field of dateFields) {
          if (row[field] != null) row[field] = new Date(row[field]);
        }
        return row;
      });
      if (data.length) await delegate.createMany({ data });
    }
  });
  console.log("Imported the SQLite records into PostgreSQL.");
} finally {
  source.close();
  await target.$disconnect();
}
