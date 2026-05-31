import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts } from "@/lib/db/schema";
import { getAuthPayload } from "@/lib/auth-session";
import { addBankAccountSchema } from "@/lib/validations/bank";

export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthPayload(req);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = addBankAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Mask account number for response
    const maskedAccountNumber =
      data.accountNumber.length > 4
        ? "****" + data.accountNumber.slice(-4)
        : "****";

    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        userId: payload.userId,
        country: data.country,
        currency: data.currency,
        swiftBic: data.swiftBic,
        accountNumber: data.accountNumber,
      })
      .returning();

    return NextResponse.json(
      {
        message: "Bank account added successfully",
        bankAccount: {
          id: bankAccount.id,
          country: bankAccount.country,
          currency: bankAccount.currency,
          swiftBic: bankAccount.swiftBic,
          accountNumber: maskedAccountNumber,
          createdAt: bankAccount.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding bank account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
