import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/forgot-password/route";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limiter";
import { sendForgotPasswordEmail } from "@/server/services/emailService";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(),
}));

jest.mock("@/server/services/emailService", () => ({
  sendForgotPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isRateLimited as jest.Mock).mockReturnValue(false);
    (db.transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: jest.fn(() => ({
          set: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve()),
          })),
        })),
        insert: jest.fn(() => ({
          values: jest.fn(() => Promise.resolve()),
        })),
      };
      await cb(tx);
    });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as jest.Mock).mockReturnValue(true);
    const res = await POST(makeRequest({ email: "alice@zendvo.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 200 and does not send email for unknown user", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "ghost@zendvo.com" }));
    expect(res.status).toBe(200);
    expect(sendForgotPasswordEmail).not.toHaveBeenCalled();
  });

  it("creates reset token and sends email for known user", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: "user-abc-123",
      name: "Alice",
      email: "alice@zendvo.com",
    });

    const res = await POST(makeRequest({ email: "alice@zendvo.com" }));

    expect(res.status).toBe(200);
    expect(db.transaction).toHaveBeenCalled();
    expect(sendForgotPasswordEmail).toHaveBeenCalledWith(
      "alice@zendvo.com",
      expect.any(String),
      "Alice",
    );
  });

  it("returns 500 on db error", async () => {
    (db.query.users.findFirst as jest.Mock).mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest({ email: "alice@zendvo.com" }));
    expect(res.status).toBe(500);
  });
});
