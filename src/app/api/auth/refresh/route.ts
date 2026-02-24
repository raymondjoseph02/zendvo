import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/tokens";
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
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 400 },
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid refresh token" },
        { status: 401 },
      );
    }

    const storedToken = (await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })) as any;

    if (!storedToken) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 401 },
      );
    }

    if (storedToken.revokedAt) {
      return NextResponse.json(
        { success: false, error: "Token has been revoked" },
        { status: 401 },
      );
    }

    if (new Date() > storedToken.expiresAt) {
      return NextResponse.json(
        { success: false, error: "Token has expired" },
        { status: 401 },
      );
    }

    const newPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await prisma.$transaction([
      prisma.refreshToken.delete({
        where: { id: storedToken.id },
      }),
      prisma.refreshToken.create({
        data: {
          userId: payload.userId,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deviceInfo: storedToken.deviceInfo,
        } as any,
      }),
    ]);

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
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
