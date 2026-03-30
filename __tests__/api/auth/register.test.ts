import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/auth/register/route";
import { isRateLimited } from "@/lib/rate-limiter";
import { createUser, findUserByEmail } from "@/server/db/authRepository";
import { sendVerificationEmail } from "@/server/services/emailService";
import { generateOTP, storeOTP } from "@/server/services/otpService";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(() => false),
}));

jest.mock("@/server/db/authRepository", () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
}));

jest.mock("@/server/services/otpService", () => ({
  generateOTP: jest.fn(),
  storeOTP: jest.fn(),
}));

jest.mock("@/server/services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isRateLimited as jest.Mock).mockReturnValue(false);
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    (createUser as jest.Mock).mockResolvedValue({
      id: "uuid-123",
      email: "test@example.com",
      name: null,
      role: "user",
      status: "unverified",
    });
    (generateOTP as jest.Mock).mockReturnValue("123456");
    (storeOTP as jest.Mock).mockResolvedValue(undefined);
    (sendVerificationEmail as jest.Mock).mockResolvedValue({ success: true });
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
  });

  it("should register a user, hash with cost 12, and initiate OTP flow", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "StrongP@ss123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.userId).toBe("uuid-123");
    expect(bcrypt.hash).toHaveBeenCalledWith("StrongP@ss123", 12);
    expect(createUser).toHaveBeenCalled();
    expect(storeOTP).toHaveBeenCalledWith("uuid-123", "123456");
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "test@example.com",
      "123456",
      undefined,
    );
  });

  it("should return 409 if email already exists", async () => {
    (findUserByEmail as jest.Mock).mockResolvedValue({
      id: "existing-user",
      email: "existing@example.com",
      name: null,
      role: "user",
      status: "unverified",
    });

    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "existing@example.com",
        password: "StrongP@ss123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.detail).toBe("Email already registered");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid email format", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        password: "StrongP@ss123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Invalid email format");
  });

  it("should return 400 for weak password", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "weak",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Password too weak");
  });

  it("should return 400 if email or password is missing", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
