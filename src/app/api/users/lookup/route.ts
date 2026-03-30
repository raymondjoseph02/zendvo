import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isRateLimited } from "@/lib/rate-limiter";
import { sanitizePhoneNumber, validateE164PhoneNumber } from "@/lib/validation";
import { createProblemDetails } from "@/lib/api-utils";

const LOOKUP_RATE_LIMIT = 5;
const LOOKUP_RATE_WINDOW_MS = 60_000;
const LOOKUP_PHONE_RATE_LIMIT = 3;
const LOOKUP_PHONE_RATE_WINDOW_MS = 60_000;
const MAX_REQUEST_BODY_BYTES = 1024;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

function splitNameParts(name: string | null): {
  first_name: string | null;
  last_name: string | null;
} {
  if (!name) {
    return {
      first_name: null,
      last_name: null,
    };
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      first_name: null,
      last_name: null,
    };
  }

  return {
    first_name: parts[0] ?? null,
    last_name: parts.length > 1 ? parts[parts.length - 1] : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid Content-Type. Expected application/json",
      );
    }

    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      Number.parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES
    ) {
      return createProblemDetails(
        "about:blank",
        "Payload Too Large",
        413,
        "Request body too large",
      );
    }

    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return createProblemDetails(
        "about:blank",
        "Forbidden",
        403,
        "CSRF protection: Invalid origin",
      );
    }

    const ip = getClientIp(request);
    if (
      isRateLimited(`lookup:${ip}`, LOOKUP_RATE_LIMIT, LOOKUP_RATE_WINDOW_MS)
    ) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many requests. Please try again later.",
      );
    }

    const body = await request.json();
    const phoneNumber =
      typeof body?.phoneNumber === "string" ? body.phoneNumber : undefined;

    if (!phoneNumber) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Phone number is required",
      );
    }

    if (!validateE164PhoneNumber(phoneNumber)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)",
      );
    }

    const sanitizedPhoneNumber = sanitizePhoneNumber(phoneNumber);

    if (
      isRateLimited(
        `lookup:${ip}:${sanitizedPhoneNumber}`,
        LOOKUP_PHONE_RATE_LIMIT,
        LOOKUP_PHONE_RATE_WINDOW_MS,
      )
    ) {
      return createProblemDetails(
        "about:blank",
        "Too Many Requests",
        429,
        "Too many requests. Please try again later.",
      );
    }

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.phoneNumber, sanitizedPhoneNumber),
        eq(users.status, "active"),
      ),
      columns: {
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: true,
        data: splitNameParts(user.name),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[USER_LOOKUP_ERROR]", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
