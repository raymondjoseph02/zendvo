import { NextRequest } from "next/server";
import { GET } from "@/app/api/gifts/[giftId]/route";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      gifts: {
        findFirst: jest.fn(),
      },
    },
  },
}));

const mockGift = {
  id: "gift-123",
  senderId: "sender-123",
  recipientId: "recipient-456",
  amount: 150,
  currency: "USD",
  message: "Happy birthday!",
  template: "birthday",
  status: "pending_otp",
  recipient: {
    id: "recipient-456",
    name: "Recipient User",
    email: "recipient@example.com",
  },
};

function makeRequest(giftId: string, userId?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (userId) {
    headers["x-user-id"] = userId;
  }

  return new NextRequest(`http://localhost/api/gifts/${giftId}`, {
    method: "GET",
    headers,
  });
}

describe("GET /api/gifts/:giftId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 with full gift details for creator", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const response = await GET(makeRequest("gift-123", "sender-123"), {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(200);
  });

  it("should return 401 when unauthenticated", async () => {
    const response = await GET(makeRequest("gift-123"), {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 when gift does not exist", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeRequest("gift-999", "sender-123"), {
      params: Promise.resolve({ giftId: "gift-999" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 when requester is not the gift creator", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const response = await GET(makeRequest("gift-123", "other-user-000"), {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 404 when gift status is not reviewable", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue({
      ...mockGift,
      status: "completed",
    });

    const response = await GET(makeRequest("gift-123", "sender-123"), {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(404);
  });
});
