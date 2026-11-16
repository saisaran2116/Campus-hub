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
