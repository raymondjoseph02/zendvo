import { db } from "@/lib/db";
import { gifts, wallets } from "@/lib/db/schema";
import { notifyGiftCompleted } from "@/server/services/notificationService";
import {
  verifyPayment as verifyPaystackPayment,
  isPaymentSuccessful as isPaystackPaymentSuccessful,
} from "@/lib/paystack/api";
import {
  verifyPayment as verifyStripePayment,
  isPaymentSuccessful as isStripePaymentSuccessful,
} from "@/lib/stripe/client";
import { validateCurrency } from "@/lib/validation";
import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> },
) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Unauthorized",
      );
    }

    const { giftId } = await params;

    const body = await request.json().catch(() => ({}));
    const blockchainTxHash =
      body.blockchain_tx_hash || body.blockchainTxHash || null;

    // Fetch the gift with sender info
    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
      with: {
        sender: { columns: { id: true, email: true, name: true } },
        recipient: { columns: { id: true, email: true, name: true } },
      },
    });

    if (!gift) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "Gift not found",
      );
    }

    // Ensure the requester is the sender (also rejects public gifts with null senderId)
    if (!gift.senderId || gift.senderId !== userId) {
      return createProblemDetails("about:blank", "Forbidden", 403, "Forbidden");
    }

    // Idempotency: already completed/sent
    if (gift.status === "completed" || gift.status === "sent") {
      return createProblemDetails(
        "about:blank",
        "Conflict",
        409,
        "Gift has already been completed",
      );
    }

    // Must be confirmed to proceed with settlement
    if (gift.status !== "confirmed") {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        `Gift must be confirmed before completion. Current status: ${gift.status}`,
      );
    }

    if (!validateCurrency(gift.currency)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Unsupported currency. Accepted: NGN, USD",
      );
    }

    // Verify payment before proceeding with on-chain operations
    const giftData = gift as any;
    if (giftData.paymentReference && giftData.paymentProvider) {
      try {
        let verificationResult;
        let isPaymentSuccessful;

        if (giftData.paymentProvider === "paystack") {
          verificationResult = await verifyPaystackPayment(
            giftData.paymentReference,
          );
          isPaymentSuccessful = isPaystackPaymentSuccessful(
            verificationResult.status,
          );
        } else if (giftData.paymentProvider === "stripe") {
          verificationResult = await verifyStripePayment(
            giftData.paymentReference,
          );
          isPaymentSuccessful = isStripePaymentSuccessful(
            verificationResult.status,
          );
        } else {
          return createProblemDetails(
            "about:blank",
            "Bad Request",
            400,
            "Unsupported payment provider",
          );
        }

        if (!isPaymentSuccessful) {
          return createProblemDetails(
            "about:blank",
            "Payment Required",
            402,
            `Payment verification failed. Payment status: ${verificationResult.status}`,
          );
        }

        // Update gift with payment verification timestamp
        await db
          .update(gifts)
          .set({ paymentVerifiedAt: new Date() } as any)
          .where(eq(gifts.id, giftId));
      } catch (error) {
        console.error("Payment verification error:", error);
        return createProblemDetails(
          "about:blank",
          "Payment Required",
          402,
          "Payment verification failed. Please try again.",
        );
      }
    }

    // Check sender wallet balance
    const senderWallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, gift.senderId),
        eq(wallets.currency, gift.currency),
      ),
    });

    if (!senderWallet || senderWallet.balance < gift.amount) {
      return createProblemDetails(
        "about:blank",
        "Payment Required",
        402,
        "Insufficient funds",
      );
    }

    // Generate a unique transaction ID
    const transactionId = `txn_${crypto.randomUUID()}`;

    // Atomic transaction: debit sender, credit recipient, update gift status
    await db.transaction(async (tx) => {
      // Debit sender wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${gift.amount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.userId, gift.senderId!),
            eq(wallets.currency, gift.currency),
          ),
        );

      // Credit recipient wallet (upsert in case wallet doesn't exist yet)
      await tx
        .insert(wallets)
        .values({
          userId: gift.recipientId,
          currency: gift.currency,
          balance: gift.amount,
        })
        .onConflictDoUpdate({
          target: [wallets.userId, wallets.currency],
          set: {
            balance: sql`${wallets.balance} + ${gift.amount}`,
            updatedAt: new Date(),
          },
        });

      // Update gift status to CLAIMED
      await tx
        .update(gifts)
        .set({ status: "completed", transactionId, blockchainTxHash })
        .where(eq(gifts.id, giftId));
    });

    // Send notifications to both parties (non-blocking)
    notifyGiftCompleted(
      gift.senderId,
      gift.recipientId,
      gift.amount,
      gift.currency,
      transactionId,
    ).catch((err) => {
      console.error("Failed to send gift completion notifications:", err);
    });

    const shareLink = `/g/${gift.slug}`;

    return NextResponse.json(
      {
        success: true,
        status: "completed",
        transactionId,
        shareLink,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error confirming gift:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
