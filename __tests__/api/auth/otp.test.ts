import { NextRequest } from "next/server";
import { POST as sendOtpPOST } from "@/app/api/auth/send-otp/route";
import { POST as verifyOtpPOST } from "@/app/api/auth/verify-otp/route";
import * as otpService from "@/server/services/otpService";
import { prisma } from "@/lib/prisma";
import * as emailService from "@/server/services/emailService";
import * as rateLimiter from "@/lib/rate-limiter";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailVerification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

jest.mock("@/server/services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
  sendSecurityAlertEmail: jest.fn(),
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(),
}));

describe("OTP Authentication Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/send-otp", () => {
    it("should send OTP successfully", async () => {
      const user = { id: "user-1", email: "test@example.com", status: "active" };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (rateLimiter.isRateLimited as jest.Mock).mockReturnValue(false);
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue({ success: true });
      (prisma.emailVerification.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await sendOtpPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.emailVerification.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it("should return 429 if rate limited", async () => {
      (rateLimiter.isRateLimited as jest.Mock).mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await sendOtpPOST(request);
      expect(response.status).toBe(429);
    });

    it("should return 404 if user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (rateLimiter.isRateLimited as jest.Mock).mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com" }),
      });

      const response = await sendOtpPOST(request);
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    it("should verify OTP successfully", async () => {
      const user = { id: "user-1", email: "test@example.com", status: "unverified", lockUntil: null };
      const { salt, hash } = otpService.hashOTP("123456");
      const verification = {
        id: "ver-1",
        userId: "user-1",
        otpHash: `${salt}:${hash}`,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(verification);
      
      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
      });

      const response = await verifyOtpPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({ status: "active" }),
      });
      expect(prisma.emailVerification.delete).toHaveBeenCalledWith({
        where: { id: "ver-1" },
      });
    });

    it("should fail with invalid OTP and increment attempts", async () => {
      const user = { id: "user-1", email: "test@example.com", status: "unverified", lockUntil: null };
      const { salt, hash } = otpService.hashOTP("123456");
      const verification = {
        id: "ver-1",
        userId: "user-1",
        otpHash: `${salt}:${hash}`,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(verification);

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
      });

      const response = await verifyOtpPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(prisma.emailVerification.update).toHaveBeenCalledWith({
        where: { id: "ver-1" },
        data: { attempts: 1 },
      });
    });

    it("should lock account and send alert after 5 failed attempts", async () => {
      const user = { id: "user-1", email: "test@example.com", status: "unverified", lockUntil: null };
      const { salt, hash } = otpService.hashOTP("123456");
      const verification = {
        id: "ver-1",
        userId: "user-1",
        otpHash: `${salt}:${hash}`,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 4, // 4 previous attempts
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(verification);

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
      });

      const response = await verifyOtpPOST(request);
      
      expect(response.status).toBe(429); // Assuming locked returns 429
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({ lockUntil: expect.any(Date) }),
      });
      expect(emailService.sendSecurityAlertEmail).toHaveBeenCalledWith(
        "test@example.com",
        undefined
      );
    });

    it("should reject request if account is already locked", async () => {
      const lockedUser = { 
        id: "user-1", 
        email: "test@example.com", 
        status: "unverified", 
        lockUntil: new Date(Date.now() + 10000) 
      };
      const verification = {
        id: "ver-1",
        userId: "user-1",
        otpHash: "hash",
        expiresAt: new Date(Date.now() + 10000),
        attempts: 5,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);
      (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(verification);

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
      });

      const response = await verifyOtpPOST(request);
      expect(response.status).toBe(429);
    });
  });
});
