import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/route";
import { prisma } from "@/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    gift: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock OTP service
jest.mock("@/server/services/otpService", () => ({
  generateOTP: jest.fn(() => "123456"),
  storeGiftOTP: jest.fn(),
}));

// Mock email service
jest.mock("@/server/services/emailService", () => ({
  sendGiftConfirmationOTP: jest.fn(() => ({ success: true })),
}));

describe("POST /api/gifts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a gift successfully with valid data", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "recipient-123",
      email: "recipient@example.com",
      name: "Recipient User",
    });
    (prisma.gift.create as jest.Mock).mockResolvedValue({
      id: "gift-123",
      senderId: "sender-123",
      recipientId: "recipient-123",
      amount: 100,
      currency: "USD",
      status: "pending_otp",
    });

    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        recipient: "recipient-123",
        amount: 100,
        currency: "USD",
        message: "Happy Birthday!",
        template: "birthday",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.giftId).toBe("gift-123");
    expect(data.status).toBe("pending_otp");
    expect(prisma.gift.create).toHaveBeenCalledWith({
      data: {
        senderId: "sender-123",
        recipientId: "recipient-123",
        amount: 100,
        currency: "USD",
        message: "Happy Birthday!",
        template: "birthday",
        status: "pending_otp",
      },
    });
  });

  it("should return 404 if recipient does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        recipient: "nonexistent-123",
        amount: 100,
        currency: "USD",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Recipient not found");
  });

  it("should return 422 for invalid amount", async () => {
    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        recipient: "recipient-123",
        amount: -100,
        currency: "USD",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toBe(
      "Amount must be a positive number within allowed limits",
    );
  });

  it("should return 422 for invalid currency", async () => {
    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        recipient: "recipient-123",
        amount: 100,
        currency: "INVALID",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid currency");
  });

  it("should return 422 if trying to send gift to self", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "sender-123",
      email: "sender@example.com",
      name: "Sender User",
    });

    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        recipient: "sender-123",
        amount: 100,
        currency: "USD",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Cannot send gift to yourself");
  });

  it("should return 401 if not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        recipient: "recipient-123",
        amount: 100,
        currency: "USD",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for missing required fields", async () => {
    const request = new NextRequest("http://localhost/api/gifts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
      },
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Recipient, amount, and currency are required");
  });
});
