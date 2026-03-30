import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/validation";
import { sendPasswordResetConfirmationEmail } from "@/server/services/emailService";
import { createProblemDetails } from "@/lib/api-utils";
import {
  completePasswordReset,
  findPasswordResetByToken,
} from "@/server/db/authRepository";

const BCRYPT_COST = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, newPassword } = body;
    const nextPassword = newPassword ?? password;

    if (!token || !nextPassword) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Token and new password are required",
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid token format",
      );
    }

    if (!validatePassword(nextPassword)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Password too weak",
      );
    }

    const resetRequest = await findPasswordResetByToken(token);

    if (!resetRequest) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid or expired token",
      );
    }

    if (resetRequest.usedAt) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Token has already been used",
      );
    }

    if (new Date() > resetRequest.expiresAt) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Token has expired",
      );
    }

    const hashedPassword = await bcrypt.hash(nextPassword, BCRYPT_COST);

    await completePasswordReset({
      resetId: resetRequest.id,
      userId: resetRequest.userId,
      passwordHash: hashedPassword,
    });

    sendPasswordResetConfirmationEmail(
      resetRequest.user.email,
      resetRequest.user.name || undefined,
    ).catch((err) => console.error("[RESET_PASSWORD_CONFIRMATION_ERROR]", err));

    console.log(
      `[AUTH_AUDIT] Password successfully reset for user: ${resetRequest.userId}`,
    );

    return NextResponse.json(
      { success: true, message: "Password has been reset successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
