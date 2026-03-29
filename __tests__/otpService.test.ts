import {
  generateOTP,
  storeOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  verifyGiftOTP,
} from "../src/server/services/otpService";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      emailVerifications: {
        findFirst: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve()),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{}])),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: "1" }, { id: "2" }])),
      })),
    })),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.requireActual("bcryptjs").hash,
}));

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
    it("should store OTP and invalidate previous records", async () => {
      await storeOTP("user-123", "123456");

      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("verifyOTP", () => {
    it("should fail if no verification found", async () => {
      (db.query.emailVerifications.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await verifyOTP("user-123", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toContain("No verification code found");
    });

    it("should fail if expired", async () => {
      (db.query.emailVerifications.findFirst as jest.Mock).mockResolvedValue({
        id: "ev-1",
        otpHash: "salt:hash",
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
      });

      const result = await verifyOTP("user-123", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });
  });

  describe("cleanupExpiredOTPs", () => {
    it("should return deleted count", async () => {
      const count = await cleanupExpiredOTPs();
      expect(count).toBe(2);
    });
  });

  describe("verifyGiftOTP", () => {
    const validGift = {
      id: "gift-123",
      otpHash: "$2a$10$abcdefghijklmnopqrstuv1234567890123456789012",
      otpExpiresAt: new Date(Date.now() + 600000),
      otpAttempts: 0,
    };

    it("should fail if otpHash is null", async () => {
      const result = await verifyGiftOTP({ ...validGift, otpHash: null }, "123456");
      expect(result.success).toBe(false);
    });

    it("should increment attempts on invalid OTP", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await verifyGiftOTP(validGift, "000000");
      expect(result.success).toBe(false);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
