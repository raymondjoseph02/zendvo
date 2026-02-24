import { NextRequest } from "next/server";

import { comparePassword } from "@/lib/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/tokens";

const selectLimitMock = jest.fn();
const selectWhereMock = jest.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = jest.fn(() => ({ where: selectWhereMock }));
const selectMock = jest.fn(() => ({ from: selectFromMock }));

const updateWhereMock = jest.fn();
const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
const updateMock = jest.fn(() => ({ set: updateSetMock }));

const insertValuesMock = jest.fn();
const insertMock = jest.fn(() => ({ values: insertValuesMock }));

type MockTransaction = {
  update: typeof updateMock;
  insert: typeof insertMock;
};

const transactionMock = jest.fn(async (callback: (tx: MockTransaction) => Promise<void>) => {
  await callback({
    update: updateMock,
    insert: insertMock,
  });
});

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(() => ({})),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
}));

jest.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
    email: "email",
    passwordHash: "passwordHash",
    role: "role",
  },
  refreshTokens: {},
}));

jest.mock("@/lib/auth", () => ({
  comparePassword: jest.fn(),
}));

jest.mock("@/lib/tokens", () => ({
  generateAccessToken: jest.fn(() => "mock-access-token"),
  generateRefreshToken: jest.fn(() => "mock-refresh-token"),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (body: object, ip: string) => {
    return new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    });
  };

  it("returns tokens when credentials are valid", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    selectLimitMock.mockResolvedValue([
      {
        id: "user-123",
        email: "test@example.com",
        passwordHash: "hashed-password",
        role: "user",
      },
    ]);
    (comparePassword as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "Password123!" }, "10.0.0.1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.access_token).toBe("mock-access-token");
    expect(json.refresh_token).toBe("mock-refresh-token");
    expect(generateAccessToken).toHaveBeenCalledWith({
      userId: "user-123",
      email: "test@example.com",
      role: "user",
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when password is invalid", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    selectLimitMock.mockResolvedValue([
      {
        id: "user-123",
        email: "test@example.com",
        passwordHash: "hashed-password",
        role: "user",
      },
    ]);
    (comparePassword as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "wrong" }, "10.0.0.2"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Invalid email or password");
  });

  it("returns 401 when email is not found", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    selectLimitMock.mockResolvedValue([]);

    const response = await POST(
      makeRequest({ email: "unknown@example.com", password: "Password123!" }, "10.0.0.3"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Invalid email or password");
    expect(comparePassword).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
  });

  it("rate limits after 5 failed attempts from same IP in 1 minute", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    selectLimitMock.mockResolvedValue([]);

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(
        makeRequest({ email: "unknown@example.com", password: "wrong" }, "10.0.0.4"),
      );
      expect(response.status).toBe(401);
    }

    const limitedResponse = await POST(
      makeRequest({ email: "unknown@example.com", password: "wrong" }, "10.0.0.4"),
    );
    const json = await limitedResponse.json();

    expect(limitedResponse.status).toBe(429);
    expect(json.error).toContain("Too many failed login attempts");
  });
});
