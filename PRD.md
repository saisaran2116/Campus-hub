# CampusHub Product Requirements

CampusHub gives students one place to discover campus events and build a schedule. Organizers can submit events, and campus managers decide what appears in the public catalogue.

## Users and workflows

| User | Goal | Acceptance criteria |
|---|---|---|
| Visitor | Discover an event | Browse approved events, filter by date and category, search by title, and open a detail page with the time, venue, and registration link when available. |
| Student | Plan attendance | Sign in, save or remove approved events, and see saved events in the schedule. If an event overlaps an existing one, the user can cancel or save anyway. |
| Organizer | Submit and track an event | Create a private draft, enter event details manually or prefill them from a poster, submit for review, and see the decision. |
| Campus manager | Review submissions | Review pending events, correct details when approving, or decline with feedback. Approval publishes the event. Each decision is recorded in the review history. |

## Supporting features

- Event suggestions use upcoming approved listings. Live suggestions and poster extraction require Gemini credentials. Manual entry and built-in poster samples are available for local evaluation.
- Google sign-in is optional. Password sign-in is available in the base setup.
- Stripe test checkout supports a configured event and test price. Live payments are outside the current scope.
- The catalogue can refresh over WebSocket when a manager approves an event. The regular browse flow also works without a socket connection.
- Light and dark themes, labelled controls, responsive forms, and visible loading, empty, and error states support the main workflows.

## Release checks

A submission starts pending, stays out of the public catalogue until approved, and appears after approval. Organizer drafts are private to their owner. A failure to check or update a schedule is visible to the user. Provider integrations require their own live checks once credentials and callbacks are configured.
