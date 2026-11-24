import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { getRedis, withinRateLimit } from "../src/lib/redis.ts";

test("Redis rate limiting isolates users and atomically caps concurrent requests", {
  skip: !process.env.REDIS_URL,
}, async () => {
  const redis = await getRedis();
  assert.ok(redis, "Start the configured Redis service before running this check.");
  const scope = `rate-test-${randomUUID()}`;
  try {
    const allowed = await Promise.all(Array.from({ length: 12 }, () => withinRateLimit(scope, "first", 3)));
    assert.equal(allowed.filter(Boolean).length, 3);
    assert.equal(await withinRateLimit(scope, "second", 3), true);
    const keys = await redis.keys(`campus:${scope}:*`);
    for (const key of keys) assert.ok(await redis.ttl(key) > 0);
  } finally {
    const keys = await redis.keys(`campus:${scope}:*`);
    if (keys.length) await redis.del(keys);
    await redis.quit();
  }
});
