import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/verify-otp/route";
import { prisma } from "@/lib/prisma";
import { verifyGiftOTP } from "@/server/services/otpService";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    gift: {
      findUnique: jest.fn(),
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

  const createRequest = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) => {
    return new NextRequest("http://localhost/api/gifts/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "sender-123",
        "x-user-email": "sender@example.com",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

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
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if giftId is missing", async () => {
    const request = createRequest({ otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("giftId and otp are required");
  });

  it("should return 400 if otp is missing", async () => {
    const request = createRequest({ giftId: "gift-123" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("giftId and otp are required");
  });

  it("should return 400 for invalid OTP format", async () => {
    const request = createRequest({ giftId: "gift-123", otp: "abc" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid OTP format. Must be 6 digits.");
  });

  it("should return 404 if gift does not exist", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest({ giftId: "nonexistent", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Gift not found");
  });

  it("should return 403 if user is not the gift sender", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue({
      ...mockGift,
      senderId: "other-user-456",
    });

    const request = createRequest({ giftId: "gift-123", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe("You are not authorized to verify this gift");
  });

  it("should return 400 if gift is already confirmed", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue({
      ...mockGift,
      status: "confirmed",
    });

    const request = createRequest({ giftId: "gift-123", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe(
      "This gift has already been verified or is no longer pending",
    );
  });

  it("should return 200 on correct OTP", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: true,
      message: "Gift OTP verified successfully!",
    });

    const request = createRequest({ giftId: "gift-123", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Gift OTP verified successfully!");
    expect(data.data).toEqual({ giftId: "gift-123", status: "otp_verified" });
    expect(mockVerifyGiftOTP).toHaveBeenCalledWith(mockGift, "123456");
  });

  it("should return 400 on incorrect OTP", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: false,
      message: "Invalid verification code. 4 attempts remaining.",
      remainingAttempts: 4,
      locked: false,
    });

    const request = createRequest({ giftId: "gift-123", otp: "000000" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.remainingAttempts).toBe(4);
  });

  it("should return 400 on expired OTP", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: false,
      message: "Verification code has expired. Please request a new one.",
    });

    const request = createRequest({ giftId: "gift-123", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("expired");
  });

  it("should return 423 when gift OTP is locked", async () => {
    (prisma.gift.findUnique as jest.Mock).mockResolvedValue(mockGift);
    mockVerifyGiftOTP.mockResolvedValue({
      success: false,
      message: "Maximum attempts exceeded. This gift has been locked.",
      locked: true,
      remainingAttempts: 0,
    });

    const request = createRequest({ giftId: "gift-123", otp: "000000" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(423);
    expect(data.success).toBe(false);
    expect(data.error).toContain("locked");
  });

  it("should return 500 on internal error", async () => {
    (prisma.gift.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createRequest({ giftId: "gift-123", otp: "123456" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
  });
});
