import { GET } from "@/app/api/gifts/public/[giftId]/summary/route";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      gifts: {
        findFirst: jest.fn(),
      },
    },
  },
}));

describe("GET /api/gifts/public/:giftId/summary", () => {
  const mockGift = {
    id: "gift-123",
    senderId: "sender-123",
    recipientId: "recipient-123",
    amount: 10000,
    currency: "NGN",
    message: "Happy Birthday!",
    status: "pending_review",
    hideAmount: false,
    hideSender: false,
    unlockDatetime: new Date("2026-03-01T12:00:00Z"),
    recipient: {
      id: "recipient-123",
      name: "John Doe",
      email: "john@example.com",
    },
    sender: {
      name: "Jane Smith",
    },
    isAnonymous: false,
    senderName: null,
    linkExpiresAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 with full gift summary", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const request = new NextRequest("http://localhost:3000/api/gifts/public/gift-123/summary");
    const response = await GET(request, { params: Promise.resolve({ giftId: "gift-123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.amount).toBe(10000);
    expect(data.data.senderName).toBe("Jane Smith");
  });

  it("should return 404 if gift does not exist", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/gifts/public/gift-123/summary");
    const response = await GET(request, { params: Promise.resolve({ giftId: "gift-123" }) });

    expect(response.status).toBe(404);
  });

  it("should return 400 if gift status is not pending_review", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue({
      ...mockGift,
      status: "confirmed",
    });

    const request = new NextRequest("http://localhost:3000/api/gifts/public/gift-123/summary");
    const response = await GET(request, { params: Promise.resolve({ giftId: "gift-123" }) });

    expect(response.status).toBe(400);
  });
});
