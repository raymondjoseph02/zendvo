import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  sanitizePhoneNumber,
  validateE164PhoneNumber,
} from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limiter";
import {
  createUser,
  findUserByEmail,
  findUserByPhoneNumber,
} from "@/server/db/authRepository";
import { generateOTP, storeOTP } from "@/server/services/otpService";
import { sendVerificationEmail } from "@/server/services/emailService";
import { createProblemDetails } from "@/lib/api-utils";

const BCRYPT_COST = 12;

export async function POST(request: NextRequest) {
  try {
    // 1. Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid Content-Type. Expected application/json",
      );
    }

    // 1.5. Request Body Size Limit (10KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10240) {
      return createProblemDetails(
        "about:blank",
        "Payload Too Large",
        413,
        "Request body too large",
      );
    }

    // 1.6. CSRF Protection (Basic Origin Validation)
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

    // 2. Rate Limiting (max 5 registration attempts per IP per hour)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip)) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many registration attempts. Please try again later.",
      );
    }

    // 3. Parse Request Body
    const body = await request.json();
    const { email, password, name, phoneNumber } = body;

    // 4. Validate Missing Fields
    if (!email || !password) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Email and password are required",
      );
    }

    const sanitizedEmail = sanitizeInput(email);
    let sanitizedPhoneNumber: string | null = null;

    // Validate and sanitize phone number if provided
    if (phoneNumber) {
      if (!validateE164PhoneNumber(phoneNumber)) {
        return createProblemDetails(
          "about:blank",
          "Bad Request",
          400,
          "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)",
        );
      }
      sanitizedPhoneNumber = sanitizePhoneNumber(phoneNumber);
    }

    // 5. Validate Email Format
    if (!validateEmail(sanitizedEmail)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid email format",
      );
    }

    // 6. Validate Password Strength
    if (!validatePassword(password)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Password too weak",
      );
    }

    // 7. Check for Duplicate Email
    const existingUser = await findUserByEmail(sanitizedEmail);

    if (existingUser) {
      return createProblemDetails(
        "about:blank",
        "Conflict",
        409,
        "Email already registered",
      );
    }

    // 8. Check for Duplicate Phone Number (if provided)
    if (sanitizedPhoneNumber) {
      const existingUserByPhone =
        await findUserByPhoneNumber(sanitizedPhoneNumber);
      if (existingUserByPhone) {
        return createProblemDetails(
          "about:blank",
          "Conflict",
          409,
          "Phone number already registered",
        );
      }
    }

    // 9. Hash Password
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // 10. Create User Record
    try {
      const user = await createUser({
        email: sanitizedEmail,
        passwordHash,
        name: name ? sanitizeInput(name) : null,
        phoneNumber: sanitizedPhoneNumber,
      });

      // Initiate email verification flow immediately after registration.
      const otp = generateOTP();
      await storeOTP(user.id, otp);

      const emailResult = await sendVerificationEmail(
        user.email,
        otp,
        user.name ?? undefined,
      );

      if (!emailResult.success) {
        console.error("[REGISTER_VERIFICATION_EMAIL_ERROR]", emailResult.error);
      }

      // 11. Return Success Response
      return NextResponse.json(
        {
          success: true,
          message: "User registered successfully",
          data: {
            userId: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            verificationInitiated: true,
          },
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      const typedError = error as { code?: string; detail?: string };
      // Handle PostgreSQL unique violation (error code 23505)
      if (typedError.code === "23505") {
        console.error("[UNIQUE_VIOLATION]", error);

        // Check which constraint was violated
        if (typedError.detail?.includes("email")) {
          return createProblemDetails(
            "about:blank",
            "Conflict",
            409,
            "Email already registered",
          );
        } else if (typedError.detail?.includes("phone_number")) {
          return createProblemDetails(
            "about:blank",
            "Conflict",
            409,
            "Phone number already registered",
          );
        } else if (typedError.detail?.includes("username")) {
          return createProblemDetails(
            "about:blank",
            "Conflict",
            409,
            "Username already taken",
          );
        }

        return createProblemDetails(
          "about:blank",
          "Conflict",
          409,
          "Account already exists with provided information",
        );
      }

      // Re-throw other errors to be caught by outer catch block
      throw error;
    }
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);

    // Handle specific Prisma errors (e.g. database connection issues)
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
