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
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid Content-Type. Expected application/json",
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10240) {
      return createProblemDetails(
        "about:blank",
        "Payload Too Large",
        413,
        "Request body too large",
      );
    }

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

    const body = await request.json();
    const { email, password, name, phoneNumber } = body;

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

    if (!validateEmail(sanitizedEmail)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid email format",
      );
    }

    if (!validatePassword(password)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Password too weak",
      );
    }

    const existingUser = await findUserByEmail(sanitizedEmail);

    if (existingUser) {
      return createProblemDetails(
        "about:blank",
        "Conflict",
        409,
        "Email already registered",
      );
    }

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

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    try {
      const user = await createUser({
        email: sanitizedEmail,
        passwordHash,
        name: name ? sanitizeInput(name) : null,
        phoneNumber: sanitizedPhoneNumber,
      });

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
      if (typedError.code === "23505") {
        console.error("[UNIQUE_VIOLATION]", error);

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

      throw error;
    }
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);

    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
