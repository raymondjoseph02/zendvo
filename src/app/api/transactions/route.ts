import { NextRequest, NextResponse } from "next/server";
import { createProblemDetails, paginatedResponse } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq, or, desc, count } from "drizzle-orm";

const ALLOWED_TYPES = ["sent", "received", "all"] as const;
type TransactionType = (typeof ALLOWED_TYPES)[number];
const INTEGER_PARAM_REGEX = /^\d+$/;

const isValidPositiveInteger = (value: string): boolean =>
  INTEGER_PARAM_REGEX.test(value) && Number.parseInt(value, 10) >= 1;

export async function GET(request: NextRequest) {
  // Auth — same pattern as gifts route
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

  // Parse & validate query params
  const typeParam = (searchParams.get("type") ?? "all") as TransactionType;
  const pageParam = searchParams.get("page") ?? "1";
  const limitParam = searchParams.get("limit") ?? "10";

  if (!ALLOWED_TYPES.includes(typeParam)) {
    return createProblemDetails(
      "about:blank",
      "Bad Request",
      400,
      "type must be one of: sent, received, all",
    );
  }

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

  // Build the WHERE clause based on type
  const whereClause =
    typeParam === "sent"
      ? eq(gifts.senderId, userId)
      : typeParam === "received"
        ? eq(gifts.recipientId, userId)
        : or(eq(gifts.senderId, userId), eq(gifts.recipientId, userId));

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

  const transactions = giftRows.map((gift) => {
    const counterparty =
      gift.senderId === userId
        ? gift.recipient
        : (gift.sender ?? {
            id: null,
            name: gift.senderName ?? "External Sender",
            email: gift.senderEmail ?? null,
          });

    return {
      id: gift.id,
      recipient: counterparty,
      amount: gift.amount,
      currency: gift.currency,
      status: gift.status,
      createdAt:
        gift.createdAt instanceof Date
          ? gift.createdAt.toISOString()
          : gift.createdAt,
    };
  });

  return paginatedResponse(transactions, total, page, limit);
}
