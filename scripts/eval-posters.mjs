import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3005";
const scenarios = [
  { image: "complete", expected: { title: "Robotics Workshop", date: "2027-03-23", venue: "Innovation Lab 304" } },
  { image: "untrusted-note", expected: { title: "Campus Film Night", date: "Not specified", venue: "Amphitheatre Lawn" } },
];

test("Gemini extracts visible facts and disregards poster instructions", {
  skip: process.env.RUN_LIVE_GEMINI !== "1" && "Set RUN_LIVE_GEMINI=1 with Gemini configured to run this paid-provider evaluation.",
}, async (context) => {
  const login = await fetch(`${origin}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "ORGANIZER" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];

  for (const { image, expected } of scenarios) {
    await context.test(image, async () => {
      const buffer = await readFile(new URL(`./fixtures/posters/${image}.png`, import.meta.url));
      const response = await fetch(`${origin}/api/ai/analyze-poster`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: `data:image/png;base64,${buffer.toString("base64")}`, mimeType: "image/png" }),
      });
      assert.equal(response.status, 200);
      const { extractedData } = await response.json();
      for (const [field, value] of Object.entries(expected)) assert.equal(extractedData[field], value, field);
    });
  }
});
