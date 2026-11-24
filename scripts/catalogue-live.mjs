import { createServer } from "node:http";
import { createClient } from "redis";
import { WebSocket, WebSocketServer } from "ws";
import { scheduleCatalogueRollover } from "./catalogue-cron.mjs";

const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3005").origin;
const port = Number(process.env.CATALOGUE_LIVE_PORT ?? 3006);
const server = createServer((_, response) => response.writeHead(404).end());
const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
const redis = createClient({ url: process.env.REDIS_URL });

function publishRefresh() {
  for (const socket of sockets.clients) {
    if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 1024) socket.send("catalogue-changed");
  }
}

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/catalogue" || request.headers.origin !== origin || sockets.clients.size >= 200) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return;
  }
  sockets.handleUpgrade(request, socket, head, (client) => {
    client.on("error", () => client.terminate());
    client.on("message", () => client.close(1008, "Receive-only channel"));
  });
});

redis.on("error", (error) => console.error("Catalogue Redis connection failed", error.message));
await redis.connect();
await redis.subscribe("campus:catalogue-changed", publishRefresh);

// Re-evaluate date filters at the campus's local day boundary.
const rollover = scheduleCatalogueRollover(publishRefresh, process.env.CAMPUS_TIME_ZONE ?? "Asia/Kolkata");
server.listen(port, "127.0.0.1", () => console.log(`Catalogue socket listening on port ${port}`));

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => {
  rollover.destroy();
  for (const socket of sockets.clients) socket.terminate();
  await redis.quit();
  sockets.close();
  server.close();
});
