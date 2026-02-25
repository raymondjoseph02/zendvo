import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail, sanitizeInput } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limiter";
import { sendForgotPasswordEmail } from "@/server/services/emailService";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip, 3)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
        },
        { status: 429 },
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

    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.$transaction([
        prisma.passwordReset.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        }),
        prisma.passwordReset.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
            ipAddress: ip,
          },
        }),
      ]);

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
   