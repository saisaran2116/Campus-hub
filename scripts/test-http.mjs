import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3005";
const request = (path, options) => fetch(new URL(path, base), options);
const json = (method, body, cookie) => ({
  method,
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
});

async function login(role) {
  const response = await request("/api/auth/demo-login", json("POST", { role }));
  assert.equal(response.status, 200, "Start the local server with demo mode enabled.");
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

test("public catalogue and server-rendered homepage", async () => {
  const home = await request("/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Upcoming events/);
  const events = await request("/api/events?limit=3");
  assert.equal(events.status, 200);
  const data = await events.json();
  assert.ok(data.events.length > 0);
  assert.ok(data.events.every(({ status }) => status === "APPROVED"));
});

test("anonymous requests, role restrictions and malformed bodies", async () => {
  assert.equal((await request("/api/drafts")).status, 401);
  const student = await login("STUDENT");
  assert.equal((await request("/api/drafts", { headers: { Cookie: student } })).status, 403);
  const organizer = await login("ORGANIZER");
  const options = json("POST", {}, organizer);
  options.body = "{";
  assert.equal((await request("/api/events", options)).status, 400);
  assert.equal((await request("/api/ai/analyze-poster", options)).status, 400);
});

test("MongoDB drafts are private and support create, read, update and delete", async () => {
  const cookie = await login("ORGANIZER");
  const manager = await login("CAMPUS_MANAGER");
  const created = await request("/api/drafts", json("POST", { title: "Integration test", notes: "" }, cookie));
  assert.equal(created.status, 201);
  const location = created.headers.get("location");
  assert.ok(location);
  try {
    assert.equal((await request(location, { headers: { Cookie: manager } })).status, 404);
    const read = await request(location, { headers: { Cookie: cookie } });
    assert.equal(read.status, 200);
    assert.equal((await read.json()).content.title, "Integration test");
    const edited = await request(location, json("PUT", { title: "Updated", notes: "A draft note" }, cookie));
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).content.title, "Updated");
    const list = await request("/api/drafts", { headers: { Cookie: cookie } });
    assert.equal(list.status, 200);
    assert.ok((await list.json()).drafts.some(({ content }) => content.title === "Updated"));
  } finally {
    assert.equal((await request(location, { method: "DELETE", headers: { Cookie: cookie } })).status, 204);
  }
  assert.equal((await request(location, { headers: { Cookie: cookie } })).status, 404);
});

test("poster sample returns structured data without a provider call", async () => {
  const cookie = await login("ORGANIZER");
  const response = await request("/api/ai/analyze-poster", json("POST", { sampleId: "sample-ai-robotics" }, cookie));
  assert.equal(response.status, 200);
  const { extractedData } = await response.json();
  assert.equal(extractedData.title, "AI & Robotics Hands-on Workshop");
  assert.equal(extractedData.confidences.title, "HIGH");
});

test("event creation, approval and public discovery", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { WebSocket } = await import("ws");
  const socketUrl = process.env.NEXT_PUBLIC_CATALOGUE_SOCKET_URL;
  const socket = socketUrl ? new WebSocket(socketUrl, { origin: new URL(base).origin }) : null;
  const database = new PrismaClient();
  let eventId;
  try {
    const organizer = await login("ORGANIZER");
    const manager = await login("CAMPUS_MANAGER");
    const title = `HTTP verification test ${Date.now()}`;
    const date = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const create = await request("/api/events", json("POST", {
      title, date, startTime: "13:00", endTime: "14:00", venue: "Lab", category: "Workshop",
    }, organizer));
    assert.equal(create.status, 201);
    const { event } = await create.json();
    eventId = event.id;
    assert.equal(event.status, "PENDING");
    const search = `/api/events?q=${encodeURIComponent(title.toLowerCase())}`;
    assert.equal((await (await request(search)).json()).count, 0);

    if (socket && socket.readyState === WebSocket.CONNECTING) {
      await new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      });
    }

    const approval = json("POST", { eventId, action: "APPROVE" }, manager);
    const notification = socket ? new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Catalogue socket did not refresh.")), 3000);
      socket.once("message", (message) => {
        clearTimeout(timeout);
        resolve(message.toString());
      });
    }) : null;
    const [approvalResult, message] = await Promise.all([request("/api/manager/verify", approval), notification]);
    assert.equal(approvalResult.status, 200);
    if (socket) assert.equal(message, "catalogue-changed");
    assert.equal((await request("/api/manager/verify", approval)).status, 409);

    const existing = await (await request(search)).json();
    assert.equal(existing.events[0].id, eventId);
    assert.equal(existing.events[0].status, "APPROVED");
  } finally {
    socket?.close();
    if (eventId) await database.event.delete({ where: { id: eventId } });
    await database.$disconnect();
  }
});
