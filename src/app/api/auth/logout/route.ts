import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_OPTIONS,
} from "@/lib/cookies";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let refreshToken = (body as { refreshToken?: string }).refreshToken;

    // Fallback: read from cookie if not in request body
    if (!refreshToken) {
      refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    }

    if (refreshToken) {
      try {
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
      } catch (e) {}
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    );

    // Clear auth cookies
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[LOGOUT_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
