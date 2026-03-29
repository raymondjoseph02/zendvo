import { NextRequest } from "next/server";
import { POST as sendOtpPOST } from "@/app/api/auth/send-otp/route";
import { POST as verifyOtpPOST } from "@/app/api/auth/verify-otp/route";
import { db } from "@/lib/db";
import * as emailService from "@/server/services/emailService";
import * as otpService from "@/server/services/otpService";
import * as rateLimiter from "@/lib/rate-limiter";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/server/services/otpService", () => ({
  generateOTP: jest.fn(() => "123456"),
  storeOTP: jest.fn().mockResolvedValue(undefined),
  checkOTPRequestRateLimitByUserId: jest.fn().mockResolvedValue({
    allowed: true,
    remainingRequests: 3,
    retryAfterMs: 0,
  }),
  verifyOTP: jest.fn(),
  hashOTP: jest.requireActual("@/server/services/otpService").hashOTP,
}));

jest.mock("@/server/services/emailService", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue({ success: true }),
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
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        status: "active",
        name: "Test User",
      });
      (rateLimiter.isRateLimited as jest.Mock).mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await sendOtpPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(otpService.storeOTP).toHaveBeenCalledWith("user-1", "123456");
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
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);
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
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        status: "unverified",
        lockUntil: null,
      });
      (otpService.verifyOTP as jest.Mock).mockResolvedValue({
        success: true,
        message: "Email verified successfully!",
      });

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
      });

      const response = await verifyOtpPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should fail with invalid OTP", async () => {
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        status: "unverified",
        lockUntil: null,
      });
      (otpService.verifyOTP as jest.Mock).mockResolvedValue({
        success: false,
        message: "Invalid verification code. 4 attempts remaining.",
        locked: false,
      });

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
      });

      const response = await verifyOtpPOST(request);
      expect(response.status).toBe(400);
    });

    it("should lock account and send alert after failed attempts", async () => {
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        status: "unverified",
        lockUntil: null,
        name: null,
      });
      (otpService.verifyOTP as jest.Mock).mockResolvedValue({
        success: false,
        message: "Maximum attempts exceeded. Account locked for 30 minutes.",
        locked: true,
        shouldSendAlert: true,
      });

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
      });

      const response = await verifyOtpPOST(request);

      expect(response.status).toBe(429);
      expect(emailService.sendSecurityAlertEmail).toHaveBeenCalledWith(
        "test@example.com",
        undefined,
      );
    });

    it("should reject request if account is already locked", async () => {
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        status: "unverified",
        lockUntil: new Date(Date.now() + 10000),
      });
      (otpService.verifyOTP as jest.Mock).mockResolvedValue({
        success: false,
        message: "Account is temporarily locked. Please try again later.",
        locked: true,
      });

      const request = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
      });

      const response = await verifyOtpPOST(request);
      expect(response.status).toBe(429);
    });
  });
});
