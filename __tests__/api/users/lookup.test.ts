import { NextRequest } from "next/server";
import { POST } from "@/app/api/users/lookup/route";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limiter";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(() => false),
}));

function makeRequest(
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest("http://localhost:3000/api/users/lookup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/users/lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isRateLimited as jest.Mock).mockReturnValue(false);
  });

  it("returns 400 when content-type is not json", async () => {
    const request = new NextRequest("http://localhost:3000/api/users/lookup", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
      },
      body: "phoneNumber=+2348112345678",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid Content-Type. Expected application/json");
  });

  it("returns 413 when the request body is too large", async () => {
    const response = await POST(
      makeRequest(
        { phoneNumber: "+2348112345678" },
        { "content-length": "2048" },
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe("Request body too large");
  });

  it("returns 403 for invalid origin", async () => {
    const response = await POST(
      makeRequest(
        { phoneNumber: "+2348112345678" },
        {
          origin: "https://evil.example",
          host: "localhost:3000",
        },
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("CSRF protection: Invalid origin");
  });

  it("returns 400 when phone number is missing", async () => {
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Phone number is required");
  });

  it("returns 400 for invalid phone number format", async () => {
    const response = await POST(makeRequest({ phoneNumber: "abc" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)",
    );
  });

  it("returns 429 when ip rate limit is exceeded", async () => {
    (isRateLimited as jest.Mock).mockReturnValueOnce(true);

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests. Please try again later.");
    expect(isRateLimited).toHaveBeenCalledWith("lookup:127.0.0.1", 5, 60_000);
  });

  it("returns 429 when per-phone rate limit is exceeded", async () => {
    (isRateLimited as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests. Please try again later.");
    expect(isRateLimited).toHaveBeenNthCalledWith(2, "lookup:127.0.0.1:+2348112345678", 3, 60_000);
  });

  it("returns null data when no verified user matches the phone number", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: null,
    });
  });

  it("returns first_name and last_name only for matched verified users", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      name: "Emrys Stone",
    });

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: {
        first_name: "Emrys",
        last_name: "Stone",
      },
    });
  });

  it("returns null last_name for single-word names", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      name: "Emrys",
    });

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual({
      first_name: "Emrys",
      last_name: null,
    });
  });

  it("sanitizes the phone number before lookup", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

    await POST(makeRequest({ phoneNumber: "+234-811 234-5678" }));

    expect(isRateLimited).toHaveBeenNthCalledWith(
      2,
      "lookup:127.0.0.1:+2348112345678",
      3,
      60_000,
    );
    expect(db.query.users.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: {
          name: true,
        },
      }),
    );
  });

  it("returns 500 on database errors", async () => {
    (db.query.users.findFirst as jest.Mock).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("does not expose any additional user fields", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue({
      name: "Emrys Stone",
      email: "emrys@example.com",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    const response = await POST(makeRequest({ phoneNumber: "+2348112345678" }));
    const data = await response.json();

    expect(data.data).toEqual({
      first_name: "Emrys",
      last_name: "Stone",
    });
    expect(data.data).not.toHaveProperty("email");
    expect(data.data).not.toHaveProperty("avatarUrl");
    expect(data.data).not.toHaveProperty("id");
  });
});
