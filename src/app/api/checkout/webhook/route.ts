import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { testStripe, ticketConfig } from "@/lib/stripe-test";

export async function POST(request: NextRequest) {
  const config = ticketConfig();
  if (!config) return new NextResponse(null, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = testStripe(config.key).webhooks.constructEvent(await request.text(), signature, config.webhookSecret);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (event.livemode) return new NextResponse(null, { status: 400 });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const id = session.metadata?.orderId;
    if (id) {
      const where = {
        id, eventId: config.eventId, paidAt: null,
        OR: [{ stripeSessionId: session.id }, { stripeSessionId: null }],
      };
      if (event.type === "checkout.session.expired") {
        await prisma.ticketOrder.deleteMany({ where });
      } else if (session.payment_status === "paid") {
        await prisma.ticketOrder.updateMany({ where, data: { paidAt: new Date(), stripeSessionId: session.id } });
      }
    }
  }
  return new NextResponse(null, { status: 204 });
}
