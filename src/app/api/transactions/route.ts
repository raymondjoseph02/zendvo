import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["sent", "received", "all"] as const;
type TransactionType = (typeof ALLOWED_TYPES)[number];
const INTEGER_PARAM_REGEX = /^\d+$/;

const isValidPositiveInteger = (value: string): boolean =>
	INTEGER_PARAM_REGEX.test(value) && Number.parseInt(value, 10) >= 1;

export async function GET(request: NextRequest) {
	// Auth — same pattern as gifts route
	const userId = request.headers.get("x-user-id");
	if (!userId) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	const { searchParams } = request.nextUrl;

	// Parse & validate query params
	const typeParam = (searchParams.get("type") ?? "all") as TransactionType;
	const pageParam = searchParams.get("page") ?? "1";
	const limitParam = searchParams.get("limit") ?? "10";

	if (!ALLOWED_TYPES.includes(typeParam)) {
		return NextResponse.json(
			{ success: false, error: "type must be one of: sent, received, all" },
			{ status: 400 },
		);
	}

	if (!isValidPositiveInteger(pageParam) || !isValidPositiveInteger(limitParam)) {
		return NextResponse.json(
			{
				success: false,
				error: "page must be >= 1 and limit must be between 1 and 100",
			},
			{ status: 400 },
		);
	}
	const page = Number.parseInt(pageParam, 10);
	const limit = Number.parseInt(limitParam, 10);
	if (limit > 100) {
		return NextResponse.json(
			{
				success: false,
				error: "page must be >= 1 and limit must be between 1 and 100",
			},
			{ status: 400 },
		);
	}

	// Build the WHERE clause based on type
	const where =
		typeParam === "sent"
			? { senderId: userId }
			: typeParam === "received"
				? { recipientId: userId }
				: { OR: [{ senderId: userId }, { recipientId: userId }] };

	const [gifts, total] = await prisma.$transaction([
		prisma.gift.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				senderId: true,
				amount: true,
				currency: true,
				status: true,
				createdAt: true,
				sender: {
					select: { id: true, name: true, email: true },
				},
				recipient: {
					select: { id: true, name: true, email: true },
				},
			},
		}),
		prisma.gift.count({ where }),
	]);

	const transactions = gifts.map((gift) => {
		const counterparty =
			gift.senderId === userId ? gift.recipient : gift.sender;

		return {
			id: gift.id,
			recipient: counterparty,
			amount: gift.amount,
			currency: gift.currency,
			status: gift.status,
			createdAt: gift.createdAt.toISOString(),
		};
	});

	return NextResponse.json({
		data: transactions,
		total,
		page,
		limit,
	});
}
