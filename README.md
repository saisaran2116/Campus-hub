# CampusHub

CampusHub lists events approved by campus staff. Students browse and save events, organizers submit events manually or use poster extraction, and managers review submissions. The schedule checks for overlapping events, including those that run past midnight.

## Run locally

Use Node.js 22+ and Docker Compose. In a new checkout:

```sh
npm ci
openssl rand -hex 32
```

Create an ignored `.env` file locally and set the following values. Generate a private value for `JWT_SECRET` with the command above. Set `NEXT_PUBLIC_DEMO_MODE=true` for the sample accounts and integration tests.

| Variable | Local value |
|---|---|
| `DATABASE_URL` | `postgresql://campus:campus-local@127.0.0.1:54329/campus_hub` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27029/campus_hub` |
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `JWT_SECRET` | Your generated value |
| `NEXT_PUBLIC_APP_URL` | `http://127.0.0.1:3005` |

```sh
docker compose up -d postgres mongo redis
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev -- --hostname 127.0.0.1
```

Open [CampusHub](http://127.0.0.1:3005). The seed command requires an empty database. To copy an existing SQLite database, use the import command **instead of seeding** after applying the migrations:

```sh
node --env-file=.env scripts/import-sqlite.mjs /path/to/your-existing.db
npm run demo:upcoming
```

The import reads SQLite without modifying it and rolls back if PostgreSQL is populated or import fails. `demo:upcoming` only creates or refreshes the three named demo listings.

For live catalogue updates, set `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3005` and `NEXT_PUBLIC_CATALOGUE_SOCKET_URL=ws://127.0.0.1:3006/catalogue` in `.env` before starting Next.js. Run `npm run dev:live` in another terminal. It forwards approved-event notifications from Redis and refreshes active date filters at campus midnight.

## Project documentation

- [PRD](PRD.md) covers users, requirements, and acceptance criteria.
- [HLD](HLD.md) describes the architecture and system dependencies.
- [LLD](LLD.md) documents implementation contracts and workflows.
- [UI audit](UI-AUDIT.md) records design changes and photography credits.

## Where the code lives

| Area | Location and role |
|---|---|
| Pages and shared UI | `src/app`, `src/components`, and `src/context`. The homepage fetches events on the server. The catalogue fetches filtered data from the events API. |
| HTTP and authentication | `src/app/api` contains route handlers. `src/proxy.ts` runs the framework middleware for protected sessions. Handlers enforce roles and validate input. |
| PostgreSQL | `prisma/schema.prisma` and `prisma/migrations` define users, events, saved events, analysis and review history, and ticket orders. `src/lib/upcoming-events.ts` joins events to organizers. The review handler records the event change and review history in a transaction. |
| MongoDB | `src/lib/drafts.ts` stores private organizer drafts. Each document embeds its title and notes and references the organizer by ID. `/api/drafts` provides CRUD, an aggregation for list and count, and a compound index for owner and update time. |
| AI | `src/lib/ai-poster-analyzer.ts` sends images to Gemini and validates the structured response. `src/lib/event-assistant.ts` ranks approved events by vector similarity, answers a bounded lookup tool call, and streams suggestions. |
| Redis and background work | `src/lib/redis.ts` handles caching and request quotas. `scripts/catalogue-live.mjs` provides the public, receive-only WebSocket and scheduled refresh. |

## Provider setup

- **Gemini:** Set `GEMINI_API_KEY` and, if needed, `GEMINI_MODEL`. Sample posters work without a key. For cost estimates in assistant logs, set the input and output USD rates per million tokens from your provider configuration.
- **Google sign-in:** Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register `/api/auth/google/callback` on the configured app origin. Google sign-in creates a student account and refuses to attach a Google identity to an existing password account.
- **Stripe test tickets:** Set `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PRICE_ID`, `STRIPE_TEST_EVENT_ID`, and `STRIPE_TEST_WEBHOOK_SECRET`. Pick one approved upcoming event and a sandbox Price. Send `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired` to `/api/checkout/webhook`. Use the event detail page to launch Checkout and check ticket status.

Keep `.env` outside version control. Rotate credentials that were previously committed if they were real. Use demo accounts only on a dedicated development database.

## Verification

| Command | Checks |
|---|---|
| `npm test` | Time parsing and overlap detection through the real scheduling module |
| `npm run test:http` | Public listing, session and role checks, request validation, MongoDB draft CRUD, poster sample, and event publication. It also checks the WebSocket when configured. Use the demo database. |
| `RUN_LIVE_GEMINI=1 npm run eval:posters` | The live model extracts fields from two synthetic poster images, including a poster with embedded instructions and an ambiguous date. Requires a Gemini key and the running demo server. |
| `docker compose --profile production-smoke up -d --build app` | Builds and starts the frontend and API in production mode at [127.0.0.1:3010](http://127.0.0.1:3010), using the initialized local databases. |

The production smoke profile is for local inspection. A hosted environment needs managed database connections, HTTPS, and provider credentials. Build the public frontend variables into the image for the target environment.
