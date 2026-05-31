import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallets, gifts } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { createProblemDetails } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Unauthorized",
      );
    }

    const { searchParams } = request.nextUrl;
    const currencyParam = searchParams.get("currency")?.toUpperCase();

    const walletConditions = [eq(wallets.userId, userId)];
    if (currencyParam) {
      walletConditions.push(eq(wallets.currency, currencyParam));
    }

    const userWallets = await db.query.wallets.findMany({
      where: and(...walletConditions),
    });

    if (userWallets.length === 0) {
      return NextResponse.json({ success: true, data: { wallets: [] } });
    }

    const [pendingRows, lockedRows] = await Promise.all([
      db
        .select({
          currency: gifts.currency,
          total: sql<number>`coalesce(sum(${gifts.amount}), 0)`,
        })
        .from(gifts)
        .where(
          and(eq(gifts.senderId, userId), eq(gifts.status, "confirmed")),
        )
        .groupBy(gifts.currency),

      db
        .select({
          currency: gifts.currency,
          total: sql<number>`coalesce(sum(${gifts.amount}), 0)`,
        })
        .from(gifts)
        .where(
          and(
            eq(gifts.recipientId, userId),
            or(eq(gifts.status, "completed"), eq(gifts.status, "sent")),
            sql`${gifts.unlockDatetime} IS NOT NULL AND ${gifts.unlockDatetime} > NOW()`,
          ),
        )
        .groupBy(gifts.currency),
    ]);

    const pendingByCurrency: Record<string, number> = {};
    for (const row of pendingRows) {
      pendingByCurrency[row.currency] = row.total;
    }

    const lockedByCurrency: Record<string, number> = {};
    for (const row of lockedRows) {
      lockedByCurrency[row.currency] = row.total;
    }

    const walletData = userWallets.map((w) => {
      const pending = pendingByCurrency[w.currency] ?? 0;
      const locked = lockedByCurrency[w.currency] ?? 0;
      const available = Math.max(0, w.balance - pending - locked);

      return {
        id: w.id,
        currency: w.currency,
        balance: w.balance,
        availableBalance: available,
        pendingWithdrawals: pending,
        lockedBalance: locked,
      };
    });

    return NextResponse.json({ success: true, data: { wallets: walletData } });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
