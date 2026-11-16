import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatLocalDate } from "@/lib/time";
import { testStripe, ticketConfig } from "@/lib/stripe-test";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  const config = ticketConfig();
  if (!config) return NextResponse.json({ error: "Test checkout is unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (body?.eventId !== config.eventId) {
    return NextResponse.json({ error: "Test tickets are unavailable for this event." }, { status: 404 });
  }

  try {
    const event = await prisma.event.findFirst({
      where: { id: config.eventId, status: "APPROVED", date: { gte: formatLocalDate(new Date()) } },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Test tickets are unavailable." }, { status: 404 });

    const userId = auth.user.userId;
    const order = await prisma.ticketOrder.upsert({
      where: { userId_eventId: { userId, eventId: event.id } },
      update: {},
      create: { userId, eventId: event.id },
    });
    if (order.paidAt) return NextResponse.json({ error: "You already have a test ticket." }, { status: 409 });

    const stripe = testStripe(config.key);
    const eventUrl = new URL(`/events/${event.id}`, config.appUrl);
    const successUrl = eventUrl;
    const session = order.stripeSessionId
      ? await stripe.checkout.sessions.retrieve(order.stripeSessionId)
      : await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ price: config.price, quantity: 1 }],
          success_url: successUrl.href,
          cancel_url: eventUrl.href,
          metadata: { orderId: order.id },
        }, { idempotencyKey: `campus-ticket-${order.id}` });

    if (session.livemode || !session.url || session.status !== "open") {
      return NextResponse.json({ error: "This checkout is closed. Your ticket may already be processing." }, { status: 409 });
    }

    if (!order.stripeSessionId) {
      await prisma.ticketOrder.updateMany({
        where: { id: order.id, stripeSessionId: null },
        data: { stripeSessionId: session.id },
      });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn("Test checkout failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Unable to start test checkout. Try again." }, { status: 503 });
  }
}
