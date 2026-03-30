import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOTP, storeOTP } from "@/server/services/otpService";
import { sendVerificationEmail } from "@/server/services/emailService";
import { createProblemDetails } from "@/lib/api-utils";

const resendAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_RESENDS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

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

    const now = Date.now();
    const userAttempts = resendAttempts.get(userId);

    if (userAttempts) {
      if (now > userAttempts.resetAt) {
        resendAttempts.delete(userId);
      } else if (userAttempts.count >= MAX_RESENDS_PER_HOUR) {
        const remainingTime = Math.ceil(
          (userAttempts.resetAt - now) / 1000 / 60,
        );
        return createProblemDetails(
          "about:blank",
          "Too Many Requests",
          429,
          "Rate limit exceeded",
        );
      }
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

    const otp = generateOTP();
    await storeOTP(userId, otp);

    const emailResult = await sendVerificationEmail(email, otp, name);

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
    }

    if (userAttempts) {
      userAttempts.count++;
    } else {
      resendAttempts.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW,
      });
    }

    const remainingResends =
      MAX_RESENDS_PER_HOUR - (resendAttempts.get(userId)?.count || 1);

    return NextResponse.json({
      success: true,
      message: "New verification code sent successfully",
      expiresIn: "10 minutes",
      remainingResends,
    });
  } catch (error) {
    console.error("Error in resend-verification:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
