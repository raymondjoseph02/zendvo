import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * POST /api/notifications/mark-read
 *
 * Marks one or more notifications as read for the authenticated user.
 * Body: { notificationIds: string[] }
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { notificationIds } = body as { notificationIds?: unknown };

  if (
    !Array.isArray(notificationIds) ||
    notificationIds.length === 0 ||
    !notificationIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "notificationIds must be a non-empty array of notification ID strings",
      },
      { status: 400 },
    );
  }

  try {
    // Ownership check: fetch the requested notifications and verify they all
    // belong to the authenticated user. This prevents users from marking
    // other users' notifications as read.
    const owned = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          inArray(notifications.id, notificationIds),
          eq(notifications.userId, userId),
        ),
      );

    const ownedIds = new Set(owned.map((n) => n.id));
    const unauthorizedIds = notificationIds.filter((id) => !ownedIds.has(id));

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more notification IDs are invalid or do not belong to you",
          invalidIds: unauthorizedIds,
        },
        { status: 403 },
      );
    }

    // Perform the update — only touch rows owned by this user
    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          inArray(notifications.id, notificationIds),
          eq(notifications.userId, userId),
        ),
      )
      .returning({ id: notifications.id });

    return NextResponse.json(
      {
        success: true,
        data: {
          markedRead: updated.length,
          ids: updated.map((row) => row.id),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
