import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, storeOTP } from "@/server/services/otpService";
import { sendVerificationEmail } from "@/server/services/emailService";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Basic Origin Check
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json(
        { success: false, error: "CSRF protection: Invalid origin" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const sanitizedEmail = sanitizeInput(email);

    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Rate Limiting: 3 requests per hour per email
    if (isRateLimited(sanitizedEmail, 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many OTP requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    // Check if user exists (Optional based on requirements, but good practice)
    // Requirement says "Send the plaintext OTP to the user's email address".
    // If user doesn't exist, we probably shouldn't send anything or should send a generic "if account exists" email.
    // However, for "auth/send-otp" it implies an auth flow.
    // Let's check if user exists to get the userId for storage.
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      // Return 200 to prevent user enumeration, but don't send OTP
      // Or 404 if this is strictly for existing users.
      // Given "auth/send-otp", it might be for login or verification.
      // If for registration, user might not exist yet?
      // But existing `send-verification` requires `userId`.
      // The requirement "Store the hashed OTP... in a secure cache/database" implies we need a way to link it to the request.
      // If we use `emailVerification` table, it requires `userId`.
      // So we must have a user.
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }, // Or 200 with generic message
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { success: false, error: "Account suspended" },
        { status: 403 },
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
      return NextResponse.json(
        { success: false, error: "Failed to send OTP email" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "OTP sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[SEND_OTP_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
