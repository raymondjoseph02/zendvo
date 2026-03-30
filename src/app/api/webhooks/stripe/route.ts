import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import Stripe from "stripe";
import { createProblemDetails } from "@/lib/api-utils";

/**
 * Stripe Webhook Handler
 *
 * This endpoint receives events from Stripe.
 * It cryptographically verifies the stripe-signature header
 * using Stripe's constructEvent method to ensure authenticity.
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
      return createProblemDetails(
        "about:blank",
        "Internal Server Error",
        500,
        "Webhook secret not configured",
      );
    }

    if (!signature) {
      console.warn("[STRIPE_WEBHOOK] Missing stripe-signature header");
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Missing signature",
      );
    }

    // Read the raw request body as text for Stripe verification
    const rawBody = await req.text();

    let event: Stripe.Event;

    try {
      // Use Stripe's official constructEvent method to verify the signature
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.warn("[STRIPE_WEBHOOK] Signature verification failed:", err);
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Invalid signature",
      );
    }

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type}`);

    /**
     * Handle Stripe events here.
     * Common events:
     * - payment_intent.succeeded: Payment was successful
     * - payment_intent.payment_failed: Payment failed
     * - checkout.session.completed: Checkout was successful
     */

    // TODO: Implement specific event handling logic
    // Example:
    // if (event.type === 'payment_intent.succeeded') {
    //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
    //   // Update gift status in database
    // }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
