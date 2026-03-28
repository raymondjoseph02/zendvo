import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { validateCurrency } from "@/lib/validation";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export interface ProcessGiftTransactionParams {
  senderId: string | null;
  recipientId: string;
  amount: number;
  currency: string;
}

export async function processGiftTransaction(
  params: ProcessGiftTransactionParams,
) {
  const { senderId, recipientId, amount, currency } = params;
  const normalizedCurrency = currency.toUpperCase();

  if (!validateCurrency(normalizedCurrency)) {
    throw new Error("Unsupported currency. Accepted: NGN, USD");
  }

  const transactionId = `txn_${crypto.randomUUID()}`;

  // If sender is authenticated, deduct from their wallet
  if (senderId) {
    const senderWallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, senderId),
        eq(wallets.currency, normalizedCurrency),
      ),
    });

    if (!senderWallet || senderWallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Update sender wallet (deduct)
    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(wallets.userId, senderId), eq(wallets.currency, normalizedCurrency)),
      );
  }

  // Upsert recipient wallet (add)
  await db
    .insert(wallets)
    .values({
      userId: recipientId,
      currency: normalizedCurrency,
      balance: amount,
    })
    .onConflictDoUpdate({
      target: [wallets.userId, wallets.currency],
      set: {
        balance: sql`${wallets.balance} + ${amount}`,
        updatedAt: new Date(),
      },
    });

  return transactionId;
}
