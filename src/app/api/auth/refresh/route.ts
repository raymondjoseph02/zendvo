import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/tokens";
import { computeFingerprint } from "@/lib/fingerprint";
import { createProblemDetails } from "@/lib/api-utils";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/lib/cookies";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let refreshToken = (body as { refreshToken?: string }).refreshToken;

    // Fallback: read from cookie if not in request body
    if (!refreshToken) {
      refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    }

    if (!refreshToken) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Refresh token is required",
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Invalid refresh token",
      );
    }

    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, refreshToken),
    });

    // Reuse detection
    if (!storedToken || storedToken.revokedAt) {
      // If a validly signed token is not in DB or is already revoked, it's a reuse!
      // Invalidate ALL tokens for this user
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, payload.userId));

      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Refresh token has been used or is invalid",
      );
    }

    if (new Date() > storedToken.expiresAt) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Token has expired",
      );
    }

    // Fingerprint validation: reject refresh attempts from a different environment
    if (storedToken.fingerprint) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "127.0.0.1";
      const userAgent = request.headers.get("user-agent");
      const incomingFingerprint = await computeFingerprint(userAgent, ip);

      if (incomingFingerprint !== storedToken.fingerprint) {
        console.warn(
          `[REFRESH] Fingerprint mismatch for user ${payload.userId} — revoking all sessions`,
        );
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.userId, payload.userId));

        return createProblemDetails(
          "about:blank",
          "Unauthorized",
          401,
          "Unauthorized: session fingerprint mismatch",
        );
      }
    }

    const fingerprint = storedToken.fingerprint ?? undefined;
    const newPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fingerprint,
    };
    const newAccessToken = await generateAccessToken(newPayload);
    const newRefreshToken = await generateRefreshToken(newPayload);

    await db.transaction(async (tx) => {
      // Mark old token as revoked
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, storedToken.id));

      // Issue new single-use token, carrying the fingerprint forward
      await tx.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: payload.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: storedToken.deviceInfo,
        fingerprint,
      });
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
      { status: 200 },
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("[REFRESH_TOKEN_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
