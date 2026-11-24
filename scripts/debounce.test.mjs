import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { debounce } from "../src/lib/debounce.ts";

test("closure retains a private timer and repeated runs coalesce", async () => {
  const calls = [];
  const first = debounce(() => calls.push("first"), 10);
  const second = debounce(() => calls.push("second"), 10);
  first.run();
  first.run();
  second.run();
  await wait(50);
  assert.deepEqual(calls, ["first", "second"]);
  first.run();
  first.cancel();
  await wait(30);
  assert.equal(calls.length, 2);
});

test("event loop runs Promise microtasks before timer callbacks", async () => {
  const order = [];
  let complete;
  const done = new Promise(resolve => { complete = resolve; });
  const task = debounce(() => { order.push("timer"); complete(); }, 0);
  task.run();
  Promise.resolve().then(() => order.push("promise"));
  order.push("synchronous");
  await done;
  assert.deepEqual(order, ["synchronous", "promise", "timer"]);
});
