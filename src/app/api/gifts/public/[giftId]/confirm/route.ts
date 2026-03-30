import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processGiftTransaction } from "@/server/services/transactionService";
import { notifyGiftConfirmed } from "@/server/services/notificationService";
import { validateCurrency } from "@/lib/validation";
import { createProblemDetails } from "@/lib/api-utils";
import {
  sendGiftCompletionToSender,
  sendGiftNotificationToRecipient,
} from "@/server/services/emailService";
import {
  verifyPayment as verifyPaystackPayment,
  isPaymentSuccessful as isPaystackPaymentSuccessful,
} from "@/lib/paystack/api";
import {
  verifyPayment as verifyStripePayment,
  isPaymentSuccessful as isStripePaymentSuccessful,
} from "@/lib/stripe/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> },
) {
  try {
    const { giftId } = await params;

    const body = await request.json().catch(() => ({}));
    const blockchainTxHash =
      body.blockchain_tx_hash || body.blockchainTxHash || null;

    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
      with: {
        sender: { columns: { id: true, name: true, email: true } },
        recipient: { columns: { id: true, name: true, email: true } },
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

    if (gift.status !== "pending_review") {
      if (gift.status === "completed") {
        return createProblemDetails(
          "about:blank",
          "Conflict",
          409,
          "Gift has already been confirmed",
        );
      }
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        `Gift cannot be confirmed. Current status: ${gift.status}. Expected: pending_review`,
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
    if (gift.paymentReference && gift.paymentProvider) {
      try {
        let verificationResult;
        let isPaymentSuccessful;

        if (gift.paymentProvider === "paystack") {
          verificationResult = await verifyPaystackPayment(
            gift.paymentReference,
          );
          isPaymentSuccessful = isPaystackPaymentSuccessful(
            verificationResult.status,
          );
        } else if (gift.paymentProvider === "stripe") {
          verificationResult = await verifyStripePayment(gift.paymentReference);
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
          .set({ paymentVerifiedAt: new Date() })
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

    const shareLink = `/g/${gift.slug}`;

    const transactionId = await processGiftTransaction({
      senderId: gift.senderId,
      recipientId: gift.recipientId,
      amount: gift.amount,
      currency: gift.currency,
    });

    await db
      .update(gifts)
      .set({
        status: "completed",
        transactionId,
        blockchainTxHash,
        updatedAt: new Date(),
      })
      .where(eq(gifts.id, giftId));

    notifyGiftConfirmed(
      gift.senderId,
      gift.recipientId,
      gift.amount,
      gift.currency,
      shareLink,
      gift.unlockDatetime ?? undefined,
    ).catch((err: unknown) => {
      console.error("[GIFT_CONFIRM_NOTIFICATION_ERROR]", err);
    });

    if (gift.senderId && gift.sender) {
      sendGiftCompletionToSender(
        gift.sender.email,
        gift.sender.name || "Valued Sender",
        shareLink,
        gift.amount,
        gift.currency,
        gift.recipient?.name || "Gift Recipient",
      ).catch((err: unknown) =>
        console.error("[GIFT_CONFIRM_SENDER_EMAIL_ERROR]", err),
      );
    } else if (gift.senderEmail && gift.senderName) {
      sendGiftCompletionToSender(
        gift.senderEmail,
        gift.senderName,
        shareLink,
        gift.amount,
        gift.currency,
        gift.recipient?.name || "Gift Recipient",
      ).catch((err: unknown) =>
        console.error("[GIFT_CONFIRM_PUBLIC_SENDER_EMAIL_ERROR]", err),
      );
    }

    if (gift.recipient) {
      sendGiftNotificationToRecipient(
        gift.recipient.email,
        gift.recipient.name || "Valued Recipient",
        gift.senderName || (gift.sender?.name ?? "Someone"),
        gift.amount,
        gift.currency,
        gift.unlockDatetime ?? undefined,
      ).catch((err: unknown) =>
        console.error("[GIFT_CONFIRM_RECIPIENT_EMAIL_ERROR]", err),
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "completed",
        shareLink,
        transactionId,
        message: "Gift confirmed successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GIFT_CONFIRM_ERROR]", error);
    if (
      error instanceof Error &&
      error.message === "Unsupported currency. Accepted: NGN, USD"
    ) {
      return createProblemDetails("about:blank", "Bad Request", 400, error);
    }
    if (
      error instanceof Error &&
      error.message.includes("Insufficient balance")
    ) {
      return createProblemDetails(
        "about:blank",
        "Unprocessable Entity",
        422,
        "Insufficient balance to send gift",
      );
    }
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
