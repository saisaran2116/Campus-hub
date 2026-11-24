import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidSafeUrl, sanitizeUrl } from "../src/lib/input-sanitization.ts";
import { scheduleCatalogueRollover } from "./catalogue-cron.mjs";

test("input sanitization rejects executable URLs and external path redirects", () => {
  for (const value of [
    "javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)", "//external.example", "/\\external.example", "https://user:password@example.com",
  ]) {
    assert.equal(isValidSafeUrl(value), false, value);
    assert.equal(sanitizeUrl(value, "/images/campus-life.jpg"), "/images/campus-life.jpg");
  }
  assert.equal(sanitizeUrl(" https://campus.example/register "), "https://campus.example/register");
  assert.equal(sanitizeUrl("/images/campus-life.jpg"), "/images/campus-life.jpg");
  assert.equal(sanitizeUrl(null), "Not specified");
});

test("cron registers a midnight task and executes the production refresh callback", async () => {
  let refreshes = 0;
  const task = scheduleCatalogueRollover(() => { refreshes++; });
  try {
    assert.ok(task.getNextRun() instanceof Date);
    const next = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(task.getNextRun());
    assert.equal(next, "00:00");
    await task.execute();
    assert.equal(refreshes, 1);
  } finally {
    await task.destroy();
  }
});
