import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyOTP } from "@/server/services/otpService";
import { sendSecurityAlertEmail } from "@/server/services/emailService";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
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
    const { email, otp } = body;

    if (!email || !otp) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Email and OTP are required",
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

    const result = await verifyOTP(user.id, otp);

    if (!result.success) {
      if (result.shouldSendAlert) {
        await sendSecurityAlertEmail(sanitizedEmail, user.name || undefined);
      }
      const status = result.locked ? 429 : 400;
      return NextResponse.json(
        { success: false, error: result.message },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, message: "Email verified successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[VERIFY_OTP_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
