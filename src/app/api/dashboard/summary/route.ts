import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/drizzle";
import { wallets, gifts } from "@/lib/db/schema";
import { eq, or, sql, and, ne } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const [walletResult, sentResult, receivedResult, countResult] =
      await Promise.all([
        db
          .select({
            balance: sql<number>`coalesce(sum(${wallets.balance}), 0)`,
          })
          .from(wallets)
          .where(eq(wallets.userId, userId)),

        db
          .select({
            totalSent: sql<number>`coalesce(sum(${gifts.amount}), 0)`,
          })
          .from(gifts)
          .where(and(eq(gifts.senderId, userId), ne(gifts.status, "failed"))),

        db
          .select({
            totalReceived: sql<number>`coalesce(sum(${gifts.amount}), 0)`,
          })
          .from(gifts)
          .where(
            and(eq(gifts.recipientId, userId), ne(gifts.status, "failed")),
          ),

        db
          .select({
            transactionCount: sql<number>`count(*)`,
          })
          .from(gifts)
          .where(
            and(
              or(eq(gifts.senderId, userId), eq(gifts.recipientId, userId)),
              ne(gifts.status, "failed"),
            ),
          ),
      ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          balance: walletResult[0]?.balance ?? 0,
          totalSent: sentResult[0]?.totalSent ?? 0,
          totalReceived: receivedResult[0]?.totalReceived ?? 0,
          transactionCount: countResult[0]?.transactionCount ?? 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
