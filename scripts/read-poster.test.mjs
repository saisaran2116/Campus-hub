import assert from "node:assert/strict";
import { test } from "node:test";
import { readPoster } from "../src/lib/read-poster.ts";

test("hoisted validation rejects unsupported and oversized posters before reading", () => {
  assert.throws(() => readPoster({ type: "text/html", size: 1 }), /Choose a PNG/);
  assert.throws(() => readPoster({ type: "image/png", size: 7 * 1024 * 1024 }), /6 MB/);
});

test("FileReader callbacks settle the Promise for success, error and abort", async () => {
  const original = globalThis.FileReader;
  let reader;
  globalThis.FileReader = class {
    constructor() { reader = this; }
    readAsDataURL() {}
  };
  try {
    const success = readPoster({ type: "image/png", size: 1 });
    reader.result = "data:image/png;base64,dGVzdA==";
    reader.onload();
    assert.equal(await success, reader.result);
    const failure = readPoster({ type: "image/jpeg", size: 1 });
    reader.onerror();
    await assert.rejects(failure, /Could not read/);
    const cancelled = readPoster({ type: "image/webp", size: 1 });
    reader.onabort();
    await assert.rejects(cancelled, /cancelled/);
  } finally {
    if (original) globalThis.FileReader = original;
    else delete globalThis.FileReader;
  }
});
