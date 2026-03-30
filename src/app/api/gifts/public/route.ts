import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, gifts } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import {
  validateAmount,
  validateCurrency,
  validateEmail,
  validateFutureDatetime,
  sanitizeInput,
  convertToUTCDate,
} from "@/lib/validation";
import { supportedCurrencyCodes } from "@/lib/db/schema";
import { isRateLimited } from "@/lib/rate-limiter";
import { validateHoneypot } from "@/lib/honeypot";
import { generateUniqueSlug } from "@/lib/slug";
import { generateUniqueShortCode } from "@/lib/shortCode";
import { createProblemDetails } from "@/lib/api-utils";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (isRateLimited(ip, 10, 60_000)) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many requests. Please try again later.",
      );
    }

    const body = await request.json();

    if (!validateHoneypot(body)) {
      console.warn("[PUBLIC_GIFT] Honeypot triggered, rejecting bot request");
      return NextResponse.json(
        {
          success: true,
          data: { giftId: crypto.randomUUID(), status: "pending_review" },
        },
        { status: 201 },
      );
    }

    const {
      recipientId,
      amount,
      currency = "NGN",
      unlockDatetime,
      hideAmount,
      message,
      senderName,
      senderEmail,
      senderAvatar,
    } = body;

    if (!recipientId || !amount || !senderName || !senderEmail) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "recipientId, amount, senderName, and senderEmail are required",
      );
    }

    if (typeof amount !== "number" || !validateAmount(amount)) {
      return createProblemDetails(
        "about:blank",
        "Unprocessable Entity",
        422,
        "Amount must be a positive number not exceeding 10,000",
      );
    }

    if (typeof currency !== "string" || !validateCurrency(currency)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        `Unsupported currency. Accepted: ${supportedCurrencyCodes.join(", ")}`,
      );
    }

    if (typeof senderEmail !== "string" || !validateEmail(senderEmail)) {
      return createProblemDetails(
        "about:blank",
        "Unprocessable Entity",
        422,
        "Invalid sender email address",
      );
    }

    if (unlockDatetime !== undefined && unlockDatetime !== null) {
      try {
        const utcDate = convertToUTCDate(unlockDatetime);
        if (!utcDate || !validateFutureDatetime(utcDate)) {
          return createProblemDetails(
            "about:blank",
            "Unprocessable Entity",
            422,
            "Delivery datetime must be a valid ISO 8601 date string with timezone in the future",
          );
        }
      } catch (error) {
        return createProblemDetails(
          "about:blank",
          "Unprocessable Entity",
          422,
          error,
        );
      }
    }

    if (
      message &&
      typeof message === "string" &&
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return createProblemDetails(
        "about:blank",
        "Unprocessable Entity",
        422,
        `Message must not exceed ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    const recipientUser = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
    });

    if (!recipientUser) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "Recipient not found",
      );
    }

    const sanitizedSenderEmail = sanitizeInput(senderEmail).toLowerCase();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const duplicate = await db.query.gifts.findFirst({
      where: and(
        eq(gifts.senderEmail, sanitizedSenderEmail),
        eq(gifts.recipientId, recipientId),
        eq(gifts.amount, amount),
        gte(gifts.createdAt, fiveMinutesAgo),
      ),
    });

    if (duplicate) {
      return createProblemDetails(
        "about:blank",
        "Conflict",
        409,
        "A similar gift was recently submitted. Please wait before trying again.",
      );
    }

    const sanitizedMessage = message ? sanitizeInput(message) : null;
    const sanitizedSenderName = sanitizeInput(senderName);
    const sanitizedSenderAvatar = senderAvatar
      ? sanitizeInput(senderAvatar)
      : null;

    const slug = await generateUniqueSlug();

    // Generate short code for public share links
    const shortCode = await generateUniqueShortCode();

    const [newGift] = await db
      .insert(gifts)
      .values({
        recipientId,
        amount,
        currency: currency.toUpperCase(),
        message: sanitizedMessage,
        status: "pending_review",
        hideAmount: hideAmount ?? false,
        unlockDatetime: utcUnlockDatetime,
        senderName: sanitizedSenderName,
        senderEmail: sanitizedSenderEmail,
        senderAvatar: sanitizedSenderAvatar,
        slug,
        shortCode,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: {
          giftId: newGift.id,
          status: "pending_review",
          slug: newGift.slug,
          shortCode: newGift.shortCode,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[PUBLIC_GIFT_CREATE_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
