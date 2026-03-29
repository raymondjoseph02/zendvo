import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/verify-otp/route";
import { db } from "@/lib/db";
import { verifyGiftOTP } from "@/server/services/otpService";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      gifts: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/server/services/otpService", () => ({
  verifyGiftOTP: jest.fn(),
}));

const mockVerifyGiftOTP = verifyGiftOTP as jest.Mock;

describe("POST /api/gifts/verify-otp", () => {
  const mockGift = {
    id: "gift-123",
    senderId: "sender-123",
    recipientId: "recipient-456",
    amount: 100,
    currency: "USD",
    status: "pending_otp",
    otpHash: "hashed-otp",
    otpExpiresAt: new Date(Date.now() + 600000),
    otpAttempts: 0,
  };

  const createRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
    new NextRequest("http://localhost/api/gifts/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
        ...headers,
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    const request = new NextRequest("http://localhost/api/gifts/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ giftId: "gift-123", otp: "123456" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 404 if gift does not exist", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(createRequest({ giftId: "nonexistent", otp: "123456" }));
    expect(response.status).toBe(404);
  });

  it("should return 200 on correct OTP", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: true,
      message: "Gift OTP verified successfully!",
    });

    const response = await POST(createRequest({ giftId: "gift-123", otp: "123456" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 400 on incorrect OTP", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: false,
      message: "Invalid verification code. 4 attempts remaining.",
      remainingAttempts: 4,
      locked: false,
    });

    const response = await POST(createRequest({ giftId: "gift-123", otp: "000000" }));
    expect(response.status).toBe(400);
  });

  it("should return 423 when gift OTP is locked", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: false,
      message: "Maximum attempts exceeded. This gift has been locked.",
      locked: true,
      remainingAttempts: 0,
    });

    const response = await POST(createRequest({ giftId: "gift-123", otp: "000000" }));
    expect(response.status).toBe(423);
  });
});
