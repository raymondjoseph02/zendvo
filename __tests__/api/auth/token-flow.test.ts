import { NextRequest } from "next/server";
import { POST as refreshPOST } from "@/app/api/auth/refresh/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { db } from "@/lib/db";
import { verifyRefreshToken } from "@/lib/tokens";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      refreshTokens: {
        findFirst: jest.fn(),
      },
    },
    transaction: jest.fn(),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock("@/lib/tokens", () => ({
  verifyRefreshToken: jest.fn(),
  generateAccessToken: jest.fn(() => Promise.resolve("new-access-token")),
  generateRefreshToken: jest.fn(() => Promise.resolve("new-refresh-token")),
}));

describe("Token Flow Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        delete: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve()),
        })),
        insert: jest.fn(() => ({
          values: jest.fn(() => Promise.resolve()),
        })),
      };
      await cb(tx);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh token successfully for valid token", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: "1",
        email: "a@b.com",
        role: "Sender",
      });
      (db.query.refreshTokens.findFirst as jest.Mock).mockResolvedValue({
        id: "tok-1",
        token: "valid-token",
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
        deviceInfo: null,
      });

      const request = new NextRequest("http://localhost/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: "valid-token" }),
      });

      const response = await refreshPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.accessToken).toBe("new-access-token");
      expect(data.data.refreshToken).toBe("new-refresh-token");
    });

    it("should return 401 for expired token", async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "1", email: "a@b.com", role: "Sender" });
      (db.query.refreshTokens.findFirst as jest.Mock).mockResolvedValue({
        id: "tok-1",
        expiresAt: new Date(Date.now() - 10000),
        revokedAt: null,
      });

      const request = new NextRequest("http://localhost/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: "expired-token" }),
      });

      const response = await refreshPOST(request);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const request = new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: "token-to-delete" }),
      });

      const response = await logoutPOST(request);
      expect(response.status).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
