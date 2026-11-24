import { schedule } from "node-cron";

// Scheduled jobs / cron: refresh date-sensitive catalogue views at campus midnight.
export function scheduleCatalogueRollover(publishRefresh, timezone = "Asia/Kolkata") {
  return schedule("0 0 * * *", publishRefresh, { timezone, noOverlap: true });
}
