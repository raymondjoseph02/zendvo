import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { comparePassword } from "@/lib/auth";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/lib/cookies";
import { db } from "@/lib/db";
import { refreshTokens, users } from "@/lib/db/schema";
import {
  generateAccessToken,
  generateRefreshToken,
  UserRole,
} from "@/lib/tokens";
import { sanitizeInput, validateEmail } from "@/lib/validation";
import { cleanupExpiredOTPs } from "@/server/services/otpService";
import { computeFingerprint } from "@/lib/fingerprint";
import { createProblemDetails } from "@/lib/api-utils";

const FAILED_ATTEMPT_LIMIT = 5;
const FAILED_ATTEMPT_WINDOW_MS = 60 * 1000;

type FailedAttemptState = {
  count: number;
  windowStartMs: number;
};

const failedAttemptsByIp = new Map<string, FailedAttemptState>();

const getDeviceId = (
  request: NextRequest,
  bodyDeviceId?: string,
): string | null => {
  if (bodyDeviceId) {
    return bodyDeviceId;
  }

  const userAgent = request.headers.get("user-agent");
  if (!userAgent) {
    return null;
  }

  // Generate a simple device ID from User-Agent
  // This creates a consistent identifier for the same browser/device
  const deviceHash = btoa(userAgent)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 32);
  return deviceHash;
};

const getClientIp = (request: NextRequest): string => {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
  );
};

const isIpRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const attemptState = failedAttemptsByIp.get(ip);

  if (!attemptState) {
    return false;
  }

  if (now - attemptState.windowStartMs >= FAILED_ATTEMPT_WINDOW_MS) {
    failedAttemptsByIp.delete(ip);
    return false;
  }

  return attemptState.count >= FAILED_ATTEMPT_LIMIT;
};

const registerFailedAttempt = (ip: string): void => {
  const now = Date.now();
  const attemptState = failedAttemptsByIp.get(ip);

  if (
    !attemptState ||
    now - attemptState.windowStartMs >= FAILED_ATTEMPT_WINDOW_MS
  ) {
    failedAttemptsByIp.set(ip, { count: 1, windowStartMs: now });
    return;
  }

  failedAttemptsByIp.set(ip, {
    count: attemptState.count + 1,
    windowStartMs: attemptState.windowStartMs,
  });
};

const clearFailedAttempts = (ip: string): void => {
  failedAttemptsByIp.delete(ip);
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isIpRateLimited(ip)) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many failed login attempts. Please try again in 1 minute.",
      );
    }

    const body = await request.json();
    const { email, password, device_id } = body;

    if (!email || !password) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Email and password are required",
      );
    }

    const sanitizedEmail = sanitizeInput(String(email)).toLowerCase();
    if (!validateEmail(sanitizedEmail)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid email format",
      );
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, sanitizedEmail))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      registerFailedAttempt(ip);
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Invalid email or password",
      );
    }

    const isPasswordValid = await comparePassword(
      String(password),
      user.passwordHash,
    );

    if (!isPasswordValid) {
      registerFailedAttempt(ip);
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Invalid email or password",
      );
    }

    clearFailedAttempts(ip);

    const userAgent = request.headers.get("user-agent");
    const fingerprint = await computeFingerprint(userAgent, ip);

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      fingerprint,
    };
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          lastLogin: new Date(),
          loginAttempts: 0,
          lockUntil: null,
        })
        .where(eq(users.id, user.id));

      await tx.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: userAgent,
        deviceId: getDeviceId(request, device_id),
        fingerprint,
      });
    });

    // Lazy cleanup of expired OTPs (non-blocking)
    cleanupExpiredOTPs().catch((error) => {
      console.error("[OTP_CLEANUP_ERROR]", error);
    });

    const response = NextResponse.json(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      { status: 200 },
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
