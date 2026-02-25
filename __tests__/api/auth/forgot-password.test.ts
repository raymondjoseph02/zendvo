import { NextRequest } from "next/server";
import crypto from "crypto";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockDeleteMany = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
    passwordResetToken: {
      deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
      create: (...a: unknown[]) => mockCreate(...a),
    },
  },
}));

// Mirrors the shape of sendForgotPasswordEmail in your email.ts
const mockSendForgotPasswordEmail = jest.fn();

jest.mock("@/lib/email", () => ({
  sendForgotPasswordEmail: (...a: unknown[]) =>
    mockSendForgotPasswordEmail(...a),
}));

// ─── Subject under test ───────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/forgot-password/route";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const FAKE_USER = {
  id: "user-abc-123",
  name: "Alice",
  email: "alice@zendvo.com",
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://app.zendvo.com";
  // Default happy-path mocks — override per test when needed
  mockFindUnique.mockResolvedValue(FAKE_USER);
  mockDeleteMany.mockResolvedValue({ count: 1 });
  mockCreate.mockResolvedValue({});
  // Simulate your email.ts dev-mode success response shape
  mockSendForgotPasswordEmail.mockResolvedValue({
    success: true,
    messageId: "dev-mode",
    message: "Reset link logged to console (development mode)",
  });
});

// ─── 1. Input validation ──────────────────────────────────────────────────────

describe("Input validation", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/valid email/i);
  });

  it("returns 400 when email is not a string", async () => {
    const res = await POST(makeRequest({ email: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is malformed", async () => {
    const res = await POST(makeRequest({ email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("does not hit the DB on invalid input", async () => {
    await POST(makeRequest({ email: "bad" }));
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

// ─── 2. User enumeration prevention ──────────────────────────────────────────

describe("User enumeration prevention", () => {
  it("returns 200 for an unregistered email", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ email: "ghost@zendvo.com" }));
    expect(res.status).toBe(200);
  });

  it("returns the exact same message for unknown and known emails", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const unknownRes = await POST(makeRequest({ email: "ghost@zendvo.com" }));
    const unknownBody = await unknownRes.json();

    const knownRes = await POST(makeRequest({ email: FAKE_USER.email }));
    const knownBody = await knownRes.json();

    expect(unknownBody.message).toBe(knownBody.message);
  });

  it("does NOT send an email or write tokens for unknown addresses", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await POST(makeRequest({ email: "ghost@zendvo.com" }));

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSendForgotPasswordEmail).not.toHaveBeenCalled();
  });
});

// ─── 3. Happy path ────────────────────────────────────────────────────────────

describe("Happy path (valid registered email)", () => {
  it("returns 200 with the standard message", async () => {
    const res = await POST(makeRequest({ email: FAKE_USER.email }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toMatch(/if that email exists/i);
  });

  it("invalidates old tokens BEFORE creating a new one", async () => {
    await POST(makeRequest({ email: FAKE_USER.email }));

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: FAKE_USER.id },
    });

    const deleteOrder = mockDeleteMany.mock.invocationCallOrder[0];
    const createOrder = mockCreate.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("stores a SHA-256 hash — not the raw token — in the DB", async () => {
    const rawBytes = Buffer.from("c".repeat(64), "hex");
    jest.spyOn(crypto, "randomBytes").mockReturnValueOnce(rawBytes as never);
    const rawHex = rawBytes.toString("hex");

    await POST(makeRequest({ email: FAKE_USER.email }));

    const expectedHash = crypto
      .createHash("sha256")
      .update(rawHex)
      .digest("hex");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: FAKE_USER.id,
          token: expectedHash,
        }),
      })
    );

    // Sanity check: hash is NOT equal to raw
    expect(expectedHash).not.toBe(rawHex);
  });

  it("sets expiresAt ~15 minutes from now", async () => {
    const before = Date.now();
    await POST(makeRequest({ email: FAKE_USER.email }));
    const after = Date.now();

    const { expiresAt }: { expiresAt: Date } =
      mockCreate.mock.calls[0][0].data;
    const ms = expiresAt.getTime();

    expect(ms).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(ms).toBeLessThanOrEqual(after + 15 * 60 * 1000 + 500);
  });

  it("calls sendForgotPasswordEmail with (email, rawToken, userName)", async () => {
    const rawBytes = Buffer.from("d".repeat(64), "hex");
    jest.spyOn(crypto, "randomBytes").mockReturnValueOnce(rawBytes as never);
    const rawHex = rawBytes.toString("hex");

    await POST(makeRequest({ email: FAKE_USER.email }));

    // Matches your email.ts signature: sendForgotPasswordEmail(email, token, userName?)
    expect(mockSendForgotPasswordEmail).toHaveBeenCalledWith(
      FAKE_USER.email,   // normalised email
      rawHex,            // RAW token (not the hash)
      FAKE_USER.name     // userName for personalisation
    );
  });

  it("normalises email to lowercase before DB lookup and email send", async () => {
    await POST(makeRequest({ email: "  ALICE@ZENDVO.COM  " }));

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "alice@zendvo.com" } })
    );
    expect(mockSendForgotPasswordEmail).toHaveBeenCalledWith(
      "alice@zendvo.com",
      expect.any(String),
      expect.anything()
    );
  });

  it("passes undefined (not null) as userName when user.name is null", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...FAKE_USER, name: null });

    await POST(makeRequest({ email: FAKE_USER.email }));

    const [, , userName] = mockSendForgotPasswordEmail.mock.calls[0];
    expect(userName).toBeUndefined();
  });
});

// ─── 4. Error handling ────────────────────────────────────────────────────────

describe("Error handling", () => {
  it("returns 500 when prisma.user.findUnique throws", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB connection lost"));
    const res = await POST(makeRequest({ email: FAKE_USER.email }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when prisma.passwordResetToken.create throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Unique constraint failed"));
    const res = await POST(makeRequest({ email: FAKE_USER.email }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when sendForgotPasswordEmail throws", async () => {
    mockSendForgotPasswordEmail.mockRejectedValueOnce(
      new Error("SMTP timeout")
    );
    const res = await POST(makeRequest({ email: FAKE_USER.email }));
    expect(res.status).toBe(500);
  });
});