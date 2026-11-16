import Stripe from "stripe";

export function ticketConfig() {
  const key = process.env.STRIPE_TEST_SECRET_KEY;
  const eventId = process.env.STRIPE_TEST_EVENT_ID;
  const webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
  const price = process.env.STRIPE_TEST_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return key?.startsWith("sk_test_") && eventId && price && webhookSecret && appUrl
    ? { key, eventId, price, webhookSecret, appUrl }
    : null;
}

export function testStripe(key: string) {
  return new Stripe(key, { maxNetworkRetries: 1, timeout: 10_000 });
}
