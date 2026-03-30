import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generateOTP,
  storeOTP,
  checkOTPRequestRateLimitByUserId,
} from "@/server/services/otpService";
import { sendVerificationEmail } from "@/server/services/emailService";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "userId and email are required",
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "User not found",
      );
    }

    if (user.status === "active") {
      return NextResponse.json(
        { message: "Email already verified" },
        { status: 200 },
      );
    }

    // Rate limiting: max 4 OTPs per 10 minutes per user
    const rateLimitResult = await checkOTPRequestRateLimitByUserId(userId);
    if (!rateLimitResult.allowed) {
      console.log(`[AUTH_AUDIT] OTP rate limited for user: ${userId}`);
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Rate limit exceeded",
      );
    }

    const otp = generateOTP();
    await storeOTP(userId, otp);

    const emailResult = await sendVerificationEmail(email, otp, name);

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      expiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("Error in send-verification:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
