import {
  generateOTP,
  storeOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  verifyGiftOTP,
} from "../src/server/services/otpService";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    emailVerification: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    gift: {
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const prisma = new PrismaClient();

describe("OTP Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateOTP", () => {
    it("should generate a 6-digit string", () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe("storeOTP", () => {
    it("should hash user OTP and store it in database", async () => {
      const userId = "user-123";
      const otp = "123456";
      const hashedOtp = "hashed-otp";
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedOtp);
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({
        id: "ev-1",
      });

      await storeOTP(userId, otp);

      expect(bcrypt.hash).toHaveBeenCalledWith(otp, 10);
      expect(prisma.emailVerification.updateMany).toHaveBeenCalledWith({
        where: { userId, isUsed: false },
        data: { isUsed: true },
      });
      expect(prisma.emailVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          otpHash: hashedOtp,
          attempts: 0,
          isUsed: false,
        }),
      });
    });
  });

  describe("verifyOTP", () => {
    const userId = "user-123";
    const otp = "123456";
    const hashedOtp = "hashed-otp";
    const validVerification = {
      id: "ev-1",
      userId,
      otpHash: hashedOtp,
      expiresAt: new Date(Date.now() + 100000),
      attempts: 0,
      isUsed: false,
      createdAt: new Date(),
    };

    it("should return success for valid OTP", async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(
        validVerification,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifyOTP(userId, otp);

      expect(result.success).toBe(true);
      expect(prisma.emailVerification.update).toHaveBeenCalledWith({
        where: { id: validVerification.id },
        data: { isUsed: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { status: "active" },
      });
    });

    it("should fail if no verification found", async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyOTP(userId, otp);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No verification code found");
    });

    it("should fail if expired", async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({
        ...validVerification,
        expiresAt: new Date(Date.now() - 100000),
      });

      const result = await verifyOTP(userId, otp);

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should fail if max attempts exceeded", async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({
        ...validVerification,
        attempts: 5,
      });

      const result = await verifyOTP(userId, otp);

      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
    });

    it("should increment attempts on invalid OTP", async () => {
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(
        validVerification,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifyOTP(userId, otp);

      expect(result.success).toBe(false);
      expect(prisma.emailVerification.update).toHaveBeenCalledWith({
        where: { id: validVerification.id },
        data: { attempts: 1 },
      });
    });
  });

  describe("cleanupExpiredOTPs", () => {
    it("should delete expired OTPs", async () => {
      (prisma.emailVerification.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const count = await cleanupExpiredOTPs();

      expect(prisma.emailVerification.deleteMany).toHaveBeenCalled();
      expect(count).toBe(5);
    });
  });

  describe("verifyGiftOTP", () => {
    const validGift = {
      id: "gift-123",
      otpHash: "hashed-otp",
      otpExpiresAt: new Date(Date.now() + 600000),
      otpAttempts: 0,
    };

    it("should return success for valid gift OTP", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.gift.update as jest.Mock).mockResolvedValue({});

      const result = await verifyGiftOTP(validGift, "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Gift OTP verified successfully!");
      expect(prisma.gift.update).toHaveBeenCalledWith({
        where: { id: "gift-123" },
        data: {
          status: "otp_verified",
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      });
    });

    it("should fail if otpHash is null", async () => {
      const result = await verifyGiftOTP(
        { ...validGift, otpHash: null },
        "123456",
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("No verification code found");
    });

    it("should fail if otpExpiresAt is null", async () => {
      const result = await verifyGiftOTP(
        { ...validGift, otpExpiresAt: null },
        "123456",
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("No verification code found");
    });

    it("should fail if OTP has expired", async () => {
      const result = await verifyGiftOTP(
        { ...validGift, otpExpiresAt: new Date(Date.now() - 100000) },
        "123456",
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should return locked if max attempts exceeded", async () => {
      const result = await verifyGiftOTP(
        { ...validGift, otpAttempts: 5 },
        "123456",
      );

      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.message).toContain("locked");
    });

    it("should increment attempts on invalid OTP", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.gift.update as jest.Mock).mockResolvedValue({});

      const result = await verifyGiftOTP(validGift, "000000");

      expect(result.success).toBe(false);
      expect(prisma.gift.update).toHaveBeenCalledWith({
        where: { id: "gift-123" },
        data: { otpAttempts: 1 },
      });
    });

    it("should return correct remaining attempts count", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.gift.update as jest.Mock).mockResolvedValue({});

      const result = await verifyGiftOTP(
        { ...validGift, otpAttempts: 3 },
        "000000",
      );

      expect(result.success).toBe(false);
      expect(result.remainingAttempts).toBe(1);
      expect(result.message).toContain("1 attempt remaining");
    });
  });
});
