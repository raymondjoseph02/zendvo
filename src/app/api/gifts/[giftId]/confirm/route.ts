import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyGiftCompleted } from "@/server/services/notificationService";
import crypto from "crypto";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ giftId: string }> },
) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { giftId } = await params;

        // Fetch the gift with sender info
        const gift = await prisma.gift.findUnique({
            where: { id: giftId },
            include: {
                sender: { select: { id: true, email: true, name: true } },
                recipient: { select: { id: true, email: true, name: true } },
            },
        });

        if (!gift) {
            return NextResponse.json(
                { success: false, error: "Gift not found" },
                { status: 404 },
            );
        }

        // Ensure the requester is the sender
        if (gift.senderId !== userId) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 },
            );
        }

        // Idempotency: already completed
        if (gift.status === "completed") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Gift has already been confirmed",
                    transactionId: gift.transactionId,
                },
                { status: 409 },
            );
        }

        // Must be otp_verified to proceed
        if (gift.status !== "otp_verified") {
            return NextResponse.json(
                {
                    success: false,
                    error: `Gift must be OTP-verified before confirmation. Current status: ${gift.status}`,
                },
                { status: 400 },
            );
        }

        // Check sender wallet balance
        const senderWallet = await prisma.wallet.findUnique({
            where: {
                userId_currency: {
                    userId: gift.senderId,
                    currency: gift.currency,
                },
            },
        });

        if (!senderWallet || senderWallet.balance < gift.amount) {
            return NextResponse.json(
                { success: false, error: "Insufficient funds" },
                { status: 402 },
            );
        }

        // Generate a unique transaction ID
        const transactionId = `txn_${crypto.randomUUID()}`;

        // Atomic transaction: debit sender, credit recipient, update gift status
        await prisma.$transaction(async (tx) => {
            // Debit sender wallet
            await tx.wallet.update({
                where: {
                    userId_currency: {
                        userId: gift.senderId,
                        currency: gift.currency,
                    },
                },
                data: {
                    balance: { decrement: gift.amount },
                },
            });

            // Credit recipient wallet (upsert in case wallet doesn't exist yet)
            await tx.wallet.upsert({
                where: {
                    userId_currency: {
                        userId: gift.recipientId,
                        currency: gift.currency,
                    },
                },
                create: {
                    userId: gift.recipientId,
                    currency: gift.currency,
                    balance: gift.amount,
                },
                update: {
                    balance: { increment: gift.amount },
                },
            });

            // Update gift status to completed
            await tx.gift.update({
                where: { id: giftId },
                data: {
                    status: "completed",
                    transactionId,
                },
            });
        });

        // Send notifications to both parties (non-blocking)
        notifyGiftCompleted(
            gift.senderId,
            gift.recipientId,
            gift.amount,
            gift.currency,
            transactionId,
        ).catch((err) => {
            console.error("Failed to send gift completion notifications:", err);
        });

        return NextResponse.json(
            {
                success: true,
                status: "completed",
                transactionId,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Error confirming gift:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}
