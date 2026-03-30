import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "@/server/services/otpService";
import { isRateLimited } from "@/lib/rate-limiter";
import { validateE164PhoneNumber } from "@/lib/validation";
import { createProblemDetails } from "@/lib/api-utils";

const OTP_RATE_LIMIT = 3; // 3 requests per hour per phone number
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Phone number is required",
      );
    }

    // Validate phone number format
    if (!validateE164PhoneNumber(phoneNumber)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)",
      );
    }

    // Rate limiting: 3 OTP requests per hour per phone number
    if (
      isRateLimited(`otp:${phoneNumber}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)
    ) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many OTP requests. Please try again later.",
      );
    }

    // Send OTP via SMS
    const result = await sendOTP(phoneNumber);

    if (!result.success) {
      return createProblemDetails("about:blank", "Bad Request", 400, result);
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 },
    );
  } catch (error) {
    console.error("[SEND_PHONE_OTP_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
