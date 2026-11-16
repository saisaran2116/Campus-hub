import assert from "node:assert/strict";
import { test } from "node:test";
import { checkTwoEventsClash, parseTimeToMinutes } from "../src/lib/clash.ts";

const slot = (startTime, endTime, date = "2026-11-16") => ({ startTime, endTime, date, title: "Event" });

test("12-hour and 24-hour inputs resolve to the same time", () => {
  assert.equal(parseTimeToMinutes("01:30 PM"), parseTimeToMinutes("13:30"));
  assert.equal(parseTimeToMinutes("12:00 AM"), 0);
  assert.ok(Number.isNaN(parseTimeToMinutes("Not specified")));
});

test("back-to-back events can coexist", () => {
  assert.equal(checkTwoEventsClash(slot("10:00", "11:00"), slot("11:00", "12:00")).hasClash, false);
});

test("overlapping and overnight events conflict", () => {
  assert.equal(checkTwoEventsClash(slot("10:00", "11:00"), slot("10:30", "12:00")).hasClash, true);
  assert.equal(checkTwoEventsClash(slot("22:00", "01:00"), slot("00:30", "02:00", "2026-11-17")).hasClash, true);
});
