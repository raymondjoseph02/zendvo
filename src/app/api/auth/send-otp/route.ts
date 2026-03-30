import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generateOTP,
  storeOTP,
  checkOTPRequestRateLimitByUserId,
} from "@/server/services/otpService";
import { sendVerificationEmail } from "@/server/services/emailService";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limiter";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Basic Origin Check
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return createProblemDetails(
        "about:blank",
        "Forbidden",
        403,
        "CSRF protection: Invalid origin",
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Email is required",
      );
    }

    const sanitizedEmail = sanitizeInput(email);

    if (!validateEmail(sanitizedEmail)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid email format",
      );
    }

    // Rate Limiting: 3 requests per hour per email
    if (isRateLimited(sanitizedEmail, 3, 60 * 60 * 1000)) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many OTP requests. Please try again later.",
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, sanitizedEmail),
    });

    if (!user) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "User not found",
      );
    }

    if (user.status === "suspended") {
      return createProblemDetails(
        "about:blank",
        "Forbidden",
        403,
        "Account suspended",
      );
    }

    // Rate limiting: max 4 OTPs per 10 minutes per user
    const rateLimitResult = await checkOTPRequestRateLimitByUserId(user.id);
    if (!rateLimitResult.allowed) {
      console.log(
        `[AUTH_AUDIT] OTP rate limited for user: ${user.id} from IP: ${
          request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
        }`,
      );
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Rate limit exceeded",
      );
    }

    const otp = generateOTP();
    await storeOTP(user.id, otp);

    const emailResult = await sendVerificationEmail(
      sanitizedEmail,
      otp,
      user.name || undefined,
    );

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return createProblemDetails(
        "about:blank",
        "Internal Server Error",
        500,
        "Failed to send OTP email",
      );
    }

    return NextResponse.json(
      { success: true, message: "OTP sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[SEND_OTP_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
