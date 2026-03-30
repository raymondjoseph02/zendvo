import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/public/route";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
      gifts: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(() => false),
}));

jest.mock("@/lib/honeypot", () => ({
  validateHoneypot: jest.fn(() => true),
}));

describe("POST /api/gifts/public", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 for an unsupported currency", async () => {
    const request = new NextRequest("http://localhost/api/gifts/public", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        recipientId: "recipient-123",
        amount: 500,
        currency: "USDC",
        senderName: "Sender",
        senderEmail: "sender@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBeDefined();
    expect(data.detail).toBe("Unsupported currency. Accepted: NGN, USD");
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
  });
});
