import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/auth/reset-password/route";
import {
  completePasswordReset,
  findPasswordResetByToken,
} from "@/server/db/authRepository";
import { sendPasswordResetConfirmationEmail } from "@/server/services/emailService";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock("@/server/db/authRepository", () => ({
  findPasswordResetByToken: jest.fn(),
  completePasswordReset: jest.fn(),
}));

jest.mock("@/server/services/emailService", () => ({
  sendPasswordResetConfirmationEmail: jest
    .fn()
    .mockResolvedValue({ success: true }),
}));

describe("POST /api/auth/reset-password", () => {
  const validToken = "550e8400-e29b-41d4-a716-446655440000";
  const validPassword = "NewStrongP@ss123";

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    (completePasswordReset as jest.Mock).mockResolvedValue(undefined);
  });

  it("should reset password successfully with valid token and password", async () => {
    (findPasswordResetByToken as jest.Mock).mockResolvedValue({
      id: "reset-1",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 10000),
      usedAt: null,
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    });

    const request = new NextRequest(
      "http://localhost/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token: validToken, newPassword: validPassword }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith(validPassword, 12);
    expect(completePasswordReset).toHaveBeenCalledWith({
      resetId: "reset-1",
      userId: "user-123",
      passwordHash: "hashed-password",
    });
    expect(sendPasswordResetConfirmationEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Test User",
    );
  });

  it("should return 400 for invalid token format", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({
          token: "invalid-token",
          newPassword: validPassword,
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Invalid token format");
  });

  it("should return 400 for weak password", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token: validToken, newPassword: "weak" }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Password too weak");
  });

  it("should return 400 if token is expired", async () => {
    (findPasswordResetByToken as jest.Mock).mockResolvedValue({
      id: "reset-1",
      userId: "user-123",
      expiresAt: new Date(Date.now() - 10000),
      usedAt: null,
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    });

    const request = new NextRequest(
      "http://localhost/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token: validToken, newPassword: validPassword }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Token has expired");
  });

  it("should return 400 if token has already been used", async () => {
    (findPasswordResetByToken as jest.Mock).mockResolvedValue({
      id: "reset-1",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 10000),
      usedAt: new Date(),
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    });

    const request = new NextRequest(
      "http://localhost/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ token: validToken, newPassword: validPassword }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.detail).toBe("Token has already been used");
  });
});
