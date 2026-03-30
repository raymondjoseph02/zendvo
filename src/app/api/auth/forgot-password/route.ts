import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResets } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limiter";
import { sendForgotPasswordEmail } from "@/server/services/emailService";
import { randomBytes } from "crypto";
import { createProblemDetails } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip, 3)) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many requests. Please try again later.",
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

    const user = await db.query.users.findFirst({
      where: eq(users.email, sanitizedEmail),
    });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Invalidate existing unused tokens and create new one
      await db.transaction(async (tx) => {
        await tx
          .update(passwordResets)
          .set({ usedAt: new Date() })
          .where(eq(passwordResets.userId, user.id));

        await tx.insert(passwordResets).values({
          userId: user.id,
          token,
          expiresAt,
          ipAddress: ip,
        });
      });

      sendForgotPasswordEmail(user.email, token, user.name || undefined).catch(
        (err) => console.error("[FORGOT_PASSWORD_EMAIL_ERROR]", err),
      );

      console.log(
        `[AUTH_AUDIT] Password reset requested for user: ${user.id} from IP: ${ip}`,
      );
    } else {
      console.log(
        `[AUTH_AUDIT] Password reset requested for non-existent email: ${sanitizedEmail} from IP: ${ip}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with that email, a password reset link has been sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
