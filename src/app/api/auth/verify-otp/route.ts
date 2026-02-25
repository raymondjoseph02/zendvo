import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/server/services/otpService";
import { sendSecurityAlertEmail } from "@/server/services/emailService";
import { validateEmail, sanitizeInput } from "@/lib/validation";

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
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
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

    // Find User
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      // User not found
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Verify OTP
    const result = await verifyOTP(user.id, otp);

    if (!result.success) {
      // Check if security alert needs to be sent
      if (result.shouldSendAlert) {
        await sendSecurityAlertEmail(sanitizedEmail, user.name || undefined);
      }

      let status = 400;
      if (result.locked) {
        // "lock the account for 30 minutes"
        // Return 429 Too Many Requests if locked? Or 403?
        // Requirement: "Return HTTP 400 with JSON... After 5 consecutive failed attempts, lock the account"
        // But if locked, subsequent requests should probably be 423 Locked or 429.
        // Let's use 400 for generic failure, but if locked, maybe 429.
        // The prompt says "Return HTTP 400 with JSON: {"success": false, "error": "Invalid or expired OTP"}"
        // It doesn't explicitly say what to return *when locked*.
        // But usually locked = 423 or 429.
        // Let's stick to 400 for invalid OTP, but if locked message is returned, use 429.
        status = 429;
      }

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
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
