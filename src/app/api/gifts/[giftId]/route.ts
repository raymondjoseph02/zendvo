import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createProblemDetails } from "@/lib/api-utils";

const REVIEWABLE_GIFT_STATUSES = new Set([
  "pending_otp",
  "otp_verified",
  "pending_review",
]);

export async function GET(
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

    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
      with: {
        recipient: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    if (gift.senderId !== userId) {
      return createProblemDetails("about:blank", "Forbidden", 403, "Forbidden");
    }

    if (!REVIEWABLE_GIFT_STATUSES.has(gift.status)) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "Gift not found",
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: gift.id,
          recipient: gift.recipient,
          amount: gift.amount,
          currency: gift.currency,
          message: gift.message,
          template: gift.template,
          status: gift.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching gift details:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
