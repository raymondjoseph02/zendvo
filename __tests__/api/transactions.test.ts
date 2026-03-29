import { GET } from "@/app/api/transactions/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    query: {
      gifts: {
        findMany: jest.fn(),
      },
    },
    select: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

function makeRequest(
  params: Record<string, string> = {},
  userId: string | null = "user-123",
) {
  const url = new URL("http://localhost/api/transactions");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url);
  if (userId) req.headers.set("x-user-id", userId);
  return req;
}

const mockGifts = [
  {
    id: "gift-1",
    senderId: "user-123",
    amount: 50,
    currency: "USD",
    status: "sent",
    createdAt: new Date("2026-01-01"),
    sender: { id: "user-123", name: "Sender", email: "sender@example.com" },
    recipient: { id: "rec-1", name: "Alice", email: "alice@example.com" },
  },
  {
    id: "gift-2",
    senderId: "other-user",
    amount: 75,
    currency: "USD",
    status: "confirmed",
    createdAt: new Date("2026-01-02"),
    sender: { id: "other-user", name: "Bob", email: "bob@example.com" },
    recipient: { id: "user-123", name: "Me", email: "me@example.com" },
  },
];

beforeEach(() => {
  (mockDb.query.gifts.findMany as jest.Mock).mockResolvedValue(mockGifts);
  (mockDb.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ value: 2 }]),
    }),
  });
});

afterEach(() => jest.clearAllMocks());

test("401 when unauthenticated", async () => {
  const res = await GET(makeRequest({}, null));
  expect(res.status).toBe(401);
});

test("400 on invalid type param", async () => {
  const res = await GET(makeRequest({ type: "unknown" }));
  expect(res.status).toBe(400);
});

test("400 on invalid page param", async () => {
  const res = await GET(makeRequest({ page: "0" }));
  expect(res.status).toBe(400);
});

test("400 on limit exceeding 100", async () => {
  const res = await GET(makeRequest({ limit: "999" }));
  expect(res.status).toBe(400);
});

test("returns paginated transactions with defaults", async () => {
  const res = await GET(makeRequest());
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.total).toBe(2);
  expect(body.page).toBe(1);
  expect(body.limit).toBe(10);
  expect(body.data).toHaveLength(2);
  expect(body.data[0].id).toBe("gift-1");
  expect(body.data[1].id).toBe("gift-2");
});

test("pagination params are respected", async () => {
  await GET(makeRequest({ page: "2", limit: "5" }));
  expect(mockDb.query.gifts.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      limit: 5,
      offset: 5,
    }),
  );
});

test("400 on non-integer page param", async () => {
  const res = await GET(makeRequest({ page: "1abc" }));
  expect(res.status).toBe(400);
});

test("400 on non-integer limit param", async () => {
  const res = await GET(makeRequest({ limit: "10.5" }));
  expect(res.status).toBe(400);
});
