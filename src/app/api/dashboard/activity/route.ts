import { NextRequest, NextResponse } from "next/server";
import { createProblemDetails, paginatedResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq, or, desc, count, ne } from "drizzle-orm";

const INTEGER_PARAM_REGEX = /^\d+$/;

const isValidPositiveInteger = (value: string): boolean =>
  INTEGER_PARAM_REGEX.test(value) && Number.parseInt(value, 10) >= 1;

export async function GET(request: NextRequest) {
  // Authentication check
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return createProblemDetails(
      "about:blank",
      "Unauthorized",
      401,
      "Unauthorized",
    );
  }

  const { searchParams } = request.nextUrl;

  // Parse pagination parameters
  const pageParam = searchParams.get("page") ?? "1";
  const limitParam = searchParams.get("limit") ?? "10";

  // Validate pagination parameters
  if (
    !isValidPositiveInteger(pageParam) ||
    !isValidPositiveInteger(limitParam)
  ) {
    return createProblemDetails(
      "about:blank",
      "Bad Request",
      400,
      "page must be >= 1 and limit must be between 1 and 100",
    );
  }

  const page = Number.parseInt(pageParam, 10);
  const limit = Number.parseInt(limitParam, 10);

  if (limit > 100) {
    return createProblemDetails(
      "about:blank",
      "Bad Request",
      400,
      "page must be >= 1 and limit must be between 1 and 100",
    );
  }

  try {
    // Query for both sent and received gifts, excluding failed transactions
    const whereClause = or(
      eq(gifts.senderId, userId),
      eq(gifts.recipientId, userId),
    );

    const [giftRows, [{ value: total }]] = await Promise.all([
      db.query.gifts.findMany({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
        orderBy: [desc(gifts.createdAt)],
        with: {
          sender: { columns: { id: true, name: true, email: true } },
          recipient: { columns: { id: true, name: true, email: true } },
        },
      }),
      db.select({ value: count() }).from(gifts).where(whereClause),
    ]);

    // Transform the data for the dashboard table
    const activities = giftRows.map((gift: (typeof giftRows)[number]) => {
      const isSender = gift.senderId === userId;
      const counterparty = isSender
        ? gift.recipient
        : (gift.sender ?? {
            id: null,
            name: gift.senderName ?? "External Sender",
            email: gift.senderEmail ?? null,
          });

      return {
        giftId: gift.id,
        date:
          gift.createdAt instanceof Date
            ? gift.createdAt.toISOString()
            : gift.createdAt,
        amount: gift.amount,
        currency: gift.currency,
        status: gift.status,
        type: isSender ? "sent" : "received",
        counterparty: {
          id: counterparty.id,
          name: counterparty.name,
          email: counterparty.email,
        },
        message: gift.message,
        isAnonymous: gift.isAnonymous,
        hideSender: gift.hideSender,
        hideAmount: gift.hideAmount,
      };
    });

    return paginatedResponse(activities, total, page, limit);
  } catch (error) {
    console.error("Dashboard activity error:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
