import { NextRequest } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@/lib/tokens";

export function getAuthPayload(
  request: Request | NextRequest,
): TokenPayload | null {
  const header =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return verifyAccessToken(token);
}
