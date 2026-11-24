import { createClient } from "redis";

async function connect(url: string) {
  const client = createClient({
    url,
    socket: { connectTimeout: 600, reconnectStrategy: false },
  });
  client.on("error", () => {
    connection = undefined;
  });
  return client.connect();
}

let connection: Promise<Awaited<ReturnType<typeof connect>> | null> | undefined;

export async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  connection ??= connect(process.env.REDIS_URL).catch(() => {
    connection = undefined;
    return null;
  });
  return connection;
}

export async function withinRateLimit(scope: string, userId: string, limit: number) {
  const redis = await getRedis();
  if (!redis) return false;
  const bucket = Math.floor(Date.now() / 60_000);
  // Redis MULTI/EXEC applies increment and expiry atomically across app instances.
  const [count] = await redis.multi().incr(`campus:${scope}:${userId}:${bucket}`)
    .expire(`campus:${scope}:${userId}:${bucket}`, 120).exec();
  return Number(count) <= limit;
}
