import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth-session";

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(() => ({})),
}));

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
  },
}));

jest.mock("@/lib/auth-session", () => ({
  getAuthPayload: jest.fn(),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = () =>
    new NextRequest("http://localhost/api/auth/me", {
      method: "GET",
    });

  it("returns unauthorized when no auth payload is present", async () => {
    (getAuthPayload as jest.Mock).mockResolvedValue(null);
    const { GET } = await import("@/app/api/auth/me/route");

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns phone_last_4 and never includes phone fields", async () => {
    (getAuthPayload as jest.Mock).mockResolvedValue({ userId: "user-1" });
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      phoneNumber: "+2348012345678",
      role: "user",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      lastLogin: new Date("2026-01-02T00:00:00.000Z"),
    });
    const { GET } = await import("@/app/api/auth/me/route");

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.phone_last_4).toBe("5678");
    expect(json.user.phone).toBeUndefined();
    expect(json.user.phoneNumber).toBeUndefined();
  });

  it("returns null phone_last_4 when user has no phone", async () => {
    (getAuthPayload as jest.Mock).mockResolvedValue({ userId: "user-2" });
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: "user-2",
      email: "nophone@example.com",
      name: "No Phone",
      phoneNumber: null,
      role: "user",
      status: "unverified",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      lastLogin: null,
    });
    const { GET } = await import("@/app/api/auth/me/route");

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.phone_last_4).toBeNull();
  });

  it("returns available characters when phone has fewer than 4", async () => {
    (getAuthPayload as jest.Mock).mockResolvedValue({ userId: "user-3" });
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: "user-3",
      email: "short@example.com",
      name: "Short Phone",
      phoneNumber: "123",
      role: "user",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      lastLogin: null,
    });
    const { GET } = await import("@/app/api/auth/me/route");

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.phone_last_4).toBe("123");
  });
});
