import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/[giftId]/confirm/route";
import { prisma } from "@/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
    prisma: {
        gift: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        wallet: {
            findUnique: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
        },
        notification: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

// Mock notification service
jest.mock("@/server/services/notificationService", () => ({
    notifyGiftCompleted: jest.fn(() => Promise.resolve()),
}));

// Mock crypto
jest.mock("crypto", () => ({
    randomUUID: jest.fn(() => "mock-uuid-1234"),
}));

const mockGift = {
    id: "gift-123",
    senderId: "sender-123",
    recipientId: "recipient-456",
    amount: 100,
    currency: "USD",
    status: "otp_verified",
    transactionId: null,
    message: "Happy Birthday!",
    template: "birthday",
    sender: { id: "sender-123", email: "sender@example.com", name: "Sender" },
    recipient: {
        id: "recipient-456",
        email: "recipient@example.com",
        name: "Recipient",
    },
};

function makeRequest(giftId: string, userId?: string) {
    const headers: Record<string, string> = {
        "content-type": "application/json",
    };
    if (userId) {
        headers["x-user-id"] = userId;
    }

    const request = new NextRequest(
        `http://localhost/api/gifts/${giftId}/confirm`,
        {
            method: "POST",
            headers,
        },
    );

    return request;
}

describe("POST /api/gifts/:giftId/confirm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 200 with status 'completed' and transactionId on success", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
            id: "wallet-1",
            userId: "sender-123",
            currency: "USD",
            balance: 500,
        });
        (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
            await fn({
                wallet: {
                    update: jest.fn(),
                    upsert: jest.fn(),
                },
                gift: {
                    update: jest.fn(),
                },
            });
        });

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.status).toBe("completed");
        expect(data.transactionId).toBe("txn_mock-uuid-1234");
    });

    it("should return 401 if not authenticated", async () => {
        const request = makeRequest("gift-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if gift does not exist", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(null);

        const request = makeRequest("nonexistent-gift", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "nonexistent-gift" }),
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Gift not found");
    });

    it("should return 403 if requester is not the sender", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);

        const request = makeRequest("gift-123", "other-user-789");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Forbidden");
    });

    it("should return 409 if gift has already been confirmed (idempotency)", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue({
            ...mockGift,
            status: "completed",
            transactionId: "txn_existing-123",
        });

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Gift has already been confirmed");
        expect(data.transactionId).toBe("txn_existing-123");
    });

    it("should return 400 if gift status is not otp_verified", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue({
            ...mockGift,
            status: "pending_otp",
        });

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("Gift must be OTP-verified");
    });

    it("should return 402 if sender has insufficient funds", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
            id: "wallet-1",
            userId: "sender-123",
            currency: "USD",
            balance: 50, // less than gift amount of 100
        });

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(402);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Insufficient funds");
    });

    it("should return 402 if sender has no wallet", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(402);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Insufficient funds");
    });

    it("should perform atomic wallet debit, credit, and gift update in a transaction", async () => {
        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
            id: "wallet-1",
            userId: "sender-123",
            currency: "USD",
            balance: 500,
        });

        const mockTxWalletUpdate = jest.fn();
        const mockTxWalletUpsert = jest.fn();
        const mockTxGiftUpdate = jest.fn();

        (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
            await fn({
                wallet: {
                    update: mockTxWalletUpdate,
                    upsert: mockTxWalletUpsert,
                },
                gift: {
                    update: mockTxGiftUpdate,
                },
            });
        });

        const request = makeRequest("gift-123", "sender-123");
        await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });

        // Verify $transaction was called
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);

        // Verify sender wallet was debited
        expect(mockTxWalletUpdate).toHaveBeenCalledWith({
            where: {
                userId_currency: {
                    userId: "sender-123",
                    currency: "USD",
                },
            },
            data: {
                balance: { decrement: 100 },
            },
        });

        // Verify recipient wallet was credited via upsert
        expect(mockTxWalletUpsert).toHaveBeenCalledWith({
            where: {
                userId_currency: {
                    userId: "recipient-456",
                    currency: "USD",
                },
            },
            create: {
                userId: "recipient-456",
                currency: "USD",
                balance: 100,
            },
            update: {
                balance: { increment: 100 },
            },
        });

        // Verify gift status was updated
        expect(mockTxGiftUpdate).toHaveBeenCalledWith({
            where: { id: "gift-123" },
            data: {
                status: "completed",
                transactionId: "txn_mock-uuid-1234",
            },
        });
    });

    it("should send notifications to both sender and recipient on success", async () => {
        const { notifyGiftCompleted } = require("@/server/services/notificationService");

        (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
            id: "wallet-1",
            userId: "sender-123",
            currency: "USD",
            balance: 500,
        });
        (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
            await fn({
                wallet: { update: jest.fn(), upsert: jest.fn() },
                gift: { update: jest.fn() },
            });
        });

        const request = makeRequest("gift-123", "sender-123");
        await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });

        expect(notifyGiftCompleted).toHaveBeenCalledWith(
            "sender-123",
            "recipient-456",
            100,
            "USD",
            "txn_mock-uuid-1234",
        );
    });

    it("should return 500 on internal server error", async () => {
        (prisma.gift.findUnique as jest.Mock).mockRejectedValue(
            new Error("Database connection failed"),
        );

        const request = makeRequest("gift-123", "sender-123");
        const response = await POST(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Internal server error");
    });
});
