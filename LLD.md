# CampusHub Low-Level Design

## Code layout

| Path | Responsibility |
|---|---|
| `src/app` | Pages and HTTP route handlers |
| `src/components` and `src/context` | Shared UI, authentication state, and theme state |
| `src/lib/event-submission.ts` | Validates and persists new submissions |
| `src/lib/event-duplicates.ts` and `src/lib/clash.ts` | Database-backed duplicate detection and time overlap calculation |
| `src/lib/ai-poster-analyzer.ts` and `src/lib/event-assistant.ts` | Structured poster extraction and streamed event suggestions |
| `src/lib/drafts.ts`, `src/lib/prisma.ts`, and `src/lib/redis.ts` | Data store connections and draft operations |
| `prisma/migrations` and `scripts` | Schema migrations, seeds, the catalogue worker, and automated checks |

## HTTP contracts

| Method and route | Behavior |
|---|---|
| `GET /api/events`, `GET /api/events/[id]` | Browse and open events. Unpublished details require a permitted role or ownership. |
| `POST /api/events`, `POST /api/organizer/submit` | Validate the form and create a pending submission. The organizer path supports existing clients. |
| `POST /api/organizer/check-conflicts` | Check for possible duplicates and venue conflicts. |
| `POST /api/manager/verify` | Approve or decline an event, record the decision, and notify catalogue listeners on approval. |
| `GET /api/saved`, `POST /api/saved/check-clash`, `POST /api/saved/toggle` | Read the personal schedule, check overlaps, and save or remove an approved event. |
| `GET/POST /api/drafts`, `GET/PUT/DELETE /api/drafts/[id]` | List and manage private organizer drafts. |
| `POST /api/ai/analyze-poster`, `POST /api/ai/event-assistant` | Extract structured poster fields or stream suggestions from approved events. |
| `POST /api/checkout`, `POST /api/checkout/webhook` | Start test checkout and process verified Stripe test events. |

## Persistence and state changes

- A PostgreSQL event references its organizer and optionally its verifier. New submissions are pending and manager review changes them to approved or declined. Approval history references the event and reviewer.
- A saved event is unique per user and event. The overlap calculation compares date and time ranges, including overnight events, before a user confirms saving.
- MongoDB draft documents store `organizerId`, `content`, and `updatedAt`. Reads and writes scope records to the authenticated owner.
- Poster analysis stores normalized fields and confidence notes. Submission and review remain explicit user actions.
- Session cookies are checked before protected operations. Route handlers also enforce role and ownership rules. Stripe updates require a verified webhook signature and test mode.

## Implementation of the six required concepts

### JavaScript event loop

The event catalogue schedules search work with `debounce` in [src/lib/debounce.ts](src/lib/debounce.ts). Its `run()` method uses `setTimeout`, and repeated searches cancel the previous timer. [src/app/events/page.tsx](src/app/events/page.tsx) invokes this helper inside a `useEffect` and awaits the search response.

Synchronous JavaScript finishes before queued Promise microtasks execute. A timer callback executes as a later task when eligible. The delay is a minimum scheduling delay, and the browser may run the callback later. [scripts/debounce.test.mjs](scripts/debounce.test.mjs) asserts the order of synchronous code, a Promise reaction, and a timer callback, and checks timer cancellation.

### JavaScript hoisting

[src/lib/read-poster.ts](src/lib/read-poster.ts) defines `readPoster(file)` before `validatePoster(file)`. The upload operation calls `validatePoster` before that declaration's source position. Function declarations are initialized when their scope is instantiated, so the call succeeds.

[src/components/CreateEventStudio.tsx](src/components/CreateEventStudio.tsx) calls `readPoster` during poster import and manual submission. [scripts/read-poster.test.mjs](scripts/read-poster.test.mjs) exercises this path with valid files, unsupported types, and oversized files. This behavior applies to function declarations. Variables declared with `let` or `const` cannot be accessed before initialization.

### JavaScript Promises vs callbacks

`readPoster` adapts the callback-based FileReader API into a Promise. Its `onload` callback resolves the result, while `onerror` and `onabort` reject it. The form awaits this Promise and handles failures through `try/catch`.

The callbacks receive browser completion events. The Promise exposes a single eventual success or failure to the caller, allowing the upload to compose with `async/await`. [scripts/read-poster.test.mjs](scripts/read-poster.test.mjs) tests success, read failure, and cancellation.

### React side effects with useEffect

[src/app/events/page.tsx](src/app/events/page.tsx) uses effects to load saved events when the authenticated user changes, subscribe to catalogue WebSocket messages, and fetch search results when filters change. The search effect depends on the query, category, date filter, ordering, and live catalogue revision.

Each effect returns cleanup for the resource it owns. Cleanup aborts pending requests, cancels delayed search callbacks, or closes the WebSocket. React runs cleanup before rerunning an effect with changed dependencies and when the component unmounts.

[src/app/events/ask/page.tsx](src/app/events/ask/page.tsx) also registers cleanup that aborts the active AI response stream when the user leaves the page. The Stop action aborts the same controller and clears the loading state.

### MongoDB schema modeling

[src/lib/event-draft.model.ts](src/lib/event-draft.model.ts) defines the `EventDraft` document, Zod input schema, and MongoDB `$jsonSchema` validator.

| Field | Stored type and relationship |
|---|---|
| `_id` | MongoDB ObjectId identifying the draft |
| `organizerId` | String reference to the organizer in PostgreSQL, enforced through application ownership checks |
| `content` | Embedded object containing required title and notes strings |
| `updatedAt` | BSON date recording the latest change |

The title must contain 1–240 characters and notes may contain up to 5,000 characters. Zod trims incoming strings. MongoDB requires the modeled fields and rejects extra properties.

[src/lib/drafts.ts](src/lib/drafts.ts) installs the validator when creating the collection, applies it to existing collections with `collMod`, and creates the compound index `{ organizerId: 1, updatedAt: -1 }`. The draft API uses authenticated ownership filters for CRUD operations. The organizer reference crosses databases and is checked by the application rather than a database foreign key.

[scripts/mongo-schema.test.mjs](scripts/mongo-schema.test.mjs) tests input validation and includes a live database check for rejected inserts and updates. The live test creates and drops a uniquely named temporary collection. It requires `MONGODB_URI` and collection-management permissions.

### PostgreSQL SQL JOINs

[src/lib/upcoming-events.ts](src/lib/upcoming-events.ts) uses `INNER JOIN` between Event and User to return organizer names on the homepage.

[src/lib/saved-events.ts](src/lib/saved-events.ts) executes the personal schedule query used by [src/app/api/saved/route.ts](src/app/api/saved/route.ts).

| Join | Purpose |
|---|---|
| SavedEvent INNER JOIN Event | Retrieve the events saved by the authenticated user |
| Event INNER JOIN User as organizer | Include organizer name and email |
| Event LEFT JOIN User as reviewer | Include an optional reviewer and preserve events without a verifier |

The query binds the authenticated user ID through Prisma's tagged SQL template. It returns organizer and reviewer objects in the API's existing shape. A missing reviewer produces `null`.

## Verification of these concepts

Run `npm run typecheck` and `npm test` for TypeScript checks and the scheduling, event-loop, poster-reading, and draft-input tests. Run `node --env-file=.env --test scripts/mongo-schema.test.mjs` to include live MongoDB enforcement checks.

Runtime acceptance checks include uploading a valid and invalid poster, changing search filters rapidly, navigating away during an assistant response, creating and editing a draft, and loading a saved schedule with both verified and unverified events. These need the corresponding running services. Source references and unit tests do not establish that every live database flow has been executed.

## Additional concepts from the coverage review

### MongoDB embedding vs referencing relationships

EventDraft embeds title and notes in `content` because the draft editor reads and updates them together. It references the owner using `organizerId` because authentication and user records belong to PostgreSQL. API handlers derive the owner filter from the verified session, keeping drafts private across organizers. The MongoDB schema cannot enforce a foreign key into PostgreSQL.

### MongoDB indexing for query performance

`openDrafts` in [src/lib/drafts.ts](src/lib/drafts.ts) creates the compound index `{ organizerId: 1, updatedAt: -1 }`. The list pipeline first matches the authenticated owner, then sorts their drafts by updatedAt descending. The leading equality field and trailing sort field align with that access pattern. [scripts/mongo-schema.test.mjs](scripts/mongo-schema.test.mjs) exercises an owner query with the same index using `hint` and verifies isolation from another owner.

### Input sanitization and injection awareness

[src/lib/input-sanitization.ts](src/lib/input-sanitization.ts) allows HTTP(S) links and local paths, rejects executable schemes, embedded controls, backslashes, protocol-relative external redirects, and credential-bearing URLs. Existing imports from auth.ts re-export these helpers so submission handlers use the same policy. React renders user text as escaped text, while Prisma query builders and tagged SQL templates bind values separately from SQL syntax. Mongo ownership filters are constructed by handlers and do not accept arbitrary client query operators.

[scripts/security-cron.test.mjs](scripts/security-cron.test.mjs) checks accepted URLs and malicious input cases.

### Rate limiting

[src/lib/redis.ts](src/lib/redis.ts) implements per-user, per-endpoint fixed-minute quotas using Redis INCR and EXPIRE in a MULTI/EXEC transaction. Poster analysis allows eight live analyses per minute and event suggestions allow four requests per minute. Exceeded limits return HTTP 429 with Retry-After. Live AI services return HTTP 503 when their required Redis service is unavailable. Local sample-poster analysis avoids external inference and is exempt from the paid-analysis quota.

[scripts/rate-limit.test.mjs](scripts/rate-limit.test.mjs) sends concurrent requests, verifies the cap and independent user buckets, and checks key expiry. It requires a live REDIS_URL.

### Scheduled jobs / cron

[scripts/catalogue-cron.mjs](scripts/catalogue-cron.mjs) registers `0 0 * * *` in the configured campus time zone with overlapping runs disabled. The running [catalogue worker](scripts/catalogue-live.mjs) calls this scheduler to notify connected browsers at midnight, so date-filtered catalogues refresh across a day boundary. The worker destroys the task and closes its connections during shutdown.

The scheduler test asserts that the next run is campus midnight and invokes the registered task to verify the refresh callback. Start the worker with `npm run dev:live` alongside the app and Redis.

### Server-side rendering

[src/app/page.tsx](src/app/page.tsx) exports an async Server Component with `dynamic = "force-dynamic"`. It awaits `getUpcomingEvents()` on the server and includes event cards in the HTML response. Database credentials and SQL execution remain server-side. A failed query renders a temporary-unavailability message.

[scripts/test-http.mjs](scripts/test-http.mjs) strips script elements before asserting homepage markup and checks for rendered event headings when upcoming events exist. This distinguishes HTML content from serialized client hydration data.
