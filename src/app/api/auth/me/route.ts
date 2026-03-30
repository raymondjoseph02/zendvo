import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthPayload } from "@/lib/auth-session";
import { createProblemDetails } from "@/lib/api-utils";

type AuthMeUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: Date;
  lastLogin: Date | null;
  email_verified: boolean;
  phone_last_4: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload(request);
    if (!payload) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Unauthorized",
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "User not found",
      );
    }

    const responseUser: AuthMeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      email_verified: user.status === "active",
      phone_last_4: user.phoneNumber?.slice(-4) ?? null,
    };

    return NextResponse.json(
      {
        success: true,
        user: responseUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in auth/me:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
