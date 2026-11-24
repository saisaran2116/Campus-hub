# Rubric evidence

All 25 mandatory topics have code or repository evidence. The 38 optional topics have implementations or local deployment evidence. Provider integrations and public hosting have separate validation requirements below.

| Mandatory area | Topics and evidence |
|---|---|
| AI App Eng (3) | LLM API integration, prompt engineering, structured outputs. The poster analyzer sends an image to Gemini with a system instruction and provider response schema, then checks the output with Zod. |
| Backend & System Design (6) | HTTP status codes, middleware, problem modeling, RESTful endpoint design, server-side error handling, frontend/backend/database integration. See `src/proxy.ts`, `/api/events`, `/api/drafts`, and the Prisma and MongoDB models. |
| Engineering Practices (2) | Environment variables and secrets management use the ignored `.env` and local configuration instructions in README.md. Git history includes feature and merge commits. |
| Frontend (10) | Async API fetching and client routing in the catalogue, navbar, and sign-in flow. The submission editor uses async/await, closures, scheduled work on the event loop, function declarations, and a Promise wrapper around FileReader callbacks. Pages compose shared React components and use `useEffect` and `useState`. |
| NoSQL (2) | MongoDB CRUD and schema modeling in `src/lib/drafts.ts` and the drafts routes. |
| SQL (2) | PostgreSQL relational PK/FK design in Prisma migrations and a SQL JOIN between events and users in `src/lib/upcoming-events.ts`. |

| Optional area | Topics and evidence |
|---|---|
| AI App Eng (7) | The event assistant executes a bounded lookup tool call, retrieves relevant events using embeddings, and streams the answer. It logs token counts and calculates estimated generation cost when rates are set. The poster evaluator includes two images and expected fields. The system instructions treat submitted content as untrusted and the allowed tool only reads approved data. |
| Auth & Security (6) | Zod validation and URL sanitization, signed JWTs, Google OAuth with PKCE and validated ID tokens, bcrypt passwords, Redis quotas for AI endpoints, and server-side role checks. |
| Backend & System Design (3) | The local production container serves the API. The poster form handles uploads and the server validates request bodies and accepted image formats. |
| Engineering Practices (3) | HTTP integration tests, a multi-stage Dockerfile, and unit tests importing the actual scheduling module. |
| Frontend (5) | Controlled forms, form validation, frontend deployment in the local production container, loading/error states, and responsive layouts across the main pages. |
| NoSQL (3) | An aggregation pipeline filters and counts drafts; documents embed content and reference an organizer ID; the collection has a compound owner/date index. |
| SQL (5) | PostgreSQL filtering, ordering, grouping, indexes, normalized relations, Prisma ORM, and an atomic event decision and review history transaction. |
| System & Integration (6) | Gemini and Google integrations, Redis caching, Stripe test checkout and signed webhook, a campus-midnight cron job, server-rendered homepage, and a Redis-backed WebSocket that signals catalogue updates. |

## Explicit concept evidence

| Concept | Production code | How to demonstrate |
|---|---|---|
| Middleware | `src/lib/auth-middleware.ts`, invoked by `src/proxy.ts` | Protected draft/organizer/manager endpoints reject missing or invalid JWTs with HTTP 401. Next.js 16 names the middleware entry point Proxy. |
| JavaScript closures | `src/lib/debounce.ts`, used by `src/app/events/page.tsx` | Each search debounce captures its own timer and callback. Rapid changes cancel previous scheduled requests. |
| JavaScript event loop | `src/lib/debounce.ts`, `scripts/debounce.test.mjs` | Tests assert synchronous work, then Promise microtasks, then timer callbacks. The catalogue uses the timer for deferred search. |
| JavaScript hoisting | `src/lib/read-poster.ts`, `scripts/read-poster.test.mjs` | `readPoster` invokes the later function declaration `validatePoster`. Tests exercise both valid files and validation failures. Manager JSX also invokes the later declaration `renderConfidenceBadge`. |
| Promises vs callbacks | `src/lib/read-poster.ts`, used by `src/components/CreateEventStudio.tsx` | `readPoster` wraps FileReader onload/onerror/onabort callbacks in a Promise. `importPoster` awaits it and handles failures. Tests cover all three callback outcomes. |
| Side effects with useEffect | `src/app/events/page.tsx`, `src/app/events/ask/page.tsx` | Effects load saved events, subscribe to WebSocket updates and debounce API search. Cleanup aborts requests, closes sockets and cancels timers. Leaving the assistant page aborts its streaming response. |
| Mongo schema modeling | `src/lib/event-draft.model.ts`, `src/lib/drafts.ts` | Dedicated document model, Zod boundary validation, MongoDB $jsonSchema enforcement, embedded content, organizer reference and compound index. Existing collections receive the validator using collMod. |
| SQL JOINs | `src/lib/upcoming-events.ts`, `src/lib/saved-events.ts`, `src/app/api/saved/route.ts` | Homepage uses INNER JOIN to retrieve organizers. The schedule API uses INNER JOIN across SavedEvent, Event and User, plus LEFT JOIN for optional reviewers. The authenticated user's ID is passed as a bound SQL parameter. |

Run `npm test` for the closure/event-loop and scheduling tests. Mongo validation requires a configured MongoDB connection and createCollection/collMod permissions. Existing documents are preserved, and future writes must satisfy the validator.

`scripts/mongo-schema.test.mjs` tests draft input validation and includes a live database check that rejects malformed inserts and updates. The live check skips when MONGODB_URI is absent. Run `node --env-file=.env --test scripts/mongo-schema.test.mjs` to include it. It creates and drops a uniquely named test collection, leaving application drafts intact.

## Runtime verification limits

- Gemini poster samples pass without external calls. Run the opt-in live evaluation and try the event assistant after configuring a Gemini key. Token cost estimates cover generation using the configured rates.
- Google login and Stripe test checkout require provider credentials and an appropriately configured callback or webhook. Code coverage does not establish a successful provider transaction.
- The frontend and backend run in Docker locally. A public deployment requires a hosting target.
- The HTTP suite tests approval-driven WebSocket notifications. The scheduled midnight rollover was reviewed in code.
