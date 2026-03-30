import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateProcessingFee } from "@/lib/fees";
import { createProblemDetails } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> },
) {
  try {
    const { giftId } = await params;

    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
      columns: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        amount: true,
        currency: true,
        message: true,
        senderName: true,
        hideAmount: true,
        hideSender: true,
        unlockDatetime: true,
        linkExpiresAt: true,
        isAnonymous: true,
      },
      with: {
        recipient: { columns: { id: true, name: true, email: true } },
        sender: { columns: { name: true } },
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

    if (gift.linkExpiresAt && new Date(gift.linkExpiresAt) < new Date()) {
      return createProblemDetails(
        "about:blank",
        "Gone",
        410,
        "This gift link has expired",
      );
    }

    if (gift.status !== "pending_review") {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Gift is not in pending_review status",
      );
    }

    const processingFee = calculateProcessingFee(gift.amount);
    const totalAmount = gift.amount + processingFee;

    return NextResponse.json(
      {
        success: true,
        data: {
          recipient: {
            id: gift.recipient?.id,
            name: gift.recipient?.name,
            email: gift.recipient?.email,
          },
          amount: gift.amount,
          currency: gift.currency,
          processingFee,
          totalAmount,
          privacySettings: {
            hideAmount: gift.hideAmount,
            hideSender: gift.hideSender,
          },
          unlockDatetime: gift.unlockDatetime
            ? gift.unlockDatetime.toISOString()
            : null,
          message: gift.message,
          senderName: gift.sender?.name ?? gift.senderName ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching gift summary:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
