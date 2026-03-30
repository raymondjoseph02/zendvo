import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { verifyGiftOTP } from "@/server/services/otpService";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { giftId, otp } = body;

    if (!giftId || !otp) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "giftId and otp are required",
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid OTP format. Must be 6 digits.",
      );
    }

    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
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
      return createProblemDetails(
        "about:blank",
        "Forbidden",
        403,
        "You are not authorized to verify this gift",
      );
    }

    if (gift.status !== "pending_otp") {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "This gift has already been verified or is no longer pending",
      );
    }

    const result = await verifyGiftOTP(gift, otp);

    if (!result.success) {
      const statusCode = result.locked ? 423 : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          remainingAttempts: result.remainingAttempts,
        },
        { status: statusCode },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: {
          giftId: gift.id,
          status: "otp_verified",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GIFT_VERIFY_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
