import { GET } from "@/app/api/transactions/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
	prisma: {
		$transaction: jest.fn(),
		gift: {
			findMany: jest.fn(),
			count: jest.fn(),
		},
	},
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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
	(mockPrisma.$transaction as jest.Mock).mockResolvedValue([mockGifts, 2]);
});

afterEach(() => jest.clearAllMocks());

test("401 when unauthenticated", async () => {
	const res = await GET(makeRequest({}, null));
	expect(res.status).toBe(401);
});

test("400 on invalid type param", async () => {
	const res = await GET(makeRequest({ type: "unknown" }));
	expect(res.status).toBe(400);
	const body = await res.json();
	expect(body.error).toMatch(/type must be/);
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
	expect(body.data[0]).toMatchObject({
		id: "gift-1",
		recipient: { id: "rec-1", name: "Alice", email: "alice@example.com" },
		amount: 50,
		currency: "USD",
		status: "sent",
	});
	expect(body.data[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
	expect(body.data[1]).toMatchObject({
		id: "gift-2",
		recipient: { id: "other-user", name: "Bob", email: "bob@example.com" },
		amount: 75,
		currency: "USD",
		status: "confirmed",
	});
	expect(body.data[1].createdAt).toBe("2026-01-02T00:00:00.000Z");
});

test("type=sent filters by senderId", async () => {
	await GET(makeRequest({ type: "sent" }));
	expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { senderId: "user-123" },
		}),
	);
	expect(mockPrisma.gift.count).toHaveBeenCalledWith({
		where: { senderId: "user-123" },
	});
});

test("type=received filters by recipientId", async () => {
	await GET(makeRequest({ type: "received" }));
	expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { recipientId: "user-123" },
		}),
	);
	expect(mockPrisma.gift.count).toHaveBeenCalledWith({
		where: { recipientId: "user-123" },
	});
});

test("type=all returns both sent and received", async () => {
	await GET(makeRequest({ type: "all" }));
	expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { OR: [{ senderId: "user-123" }, { recipientId: "user-123" }] },
		}),
	);
	expect(mockPrisma.gift.count).toHaveBeenCalledWith({
		where: { OR: [{ senderId: "user-123" }, { recipientId: "user-123" }] },
	});
});

test("pagination params are respected", async () => {
	await GET(makeRequest({ page: "2", limit: "5" }));
	expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			skip: 5,
			take: 5,
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
