import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/drizzle";
import { gifts } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { createProblemDetails } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return createProblemDetails(
      "about:blank",
      "Unauthorized",
      401,
      "Unauthorized",
    );
  }

  try {
    const [sentResult, receivedResult] = await Promise.all([
      db
        .select({
          totalSent: sql<number>`coalesce(count(*), 0)`,
        })
        .from(gifts)
        .where(and(eq(gifts.senderId, userId), ne(gifts.status, "failed"))),

      db
        .select({
          totalReceived: sql<number>`coalesce(count(*), 0)`,
        })
        .from(gifts)
        .where(and(eq(gifts.recipientId, userId), ne(gifts.status, "failed"))),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalSent: sentResult[0]?.totalSent ?? 0,
          totalReceived: receivedResult[0]?.totalReceived ?? 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
