import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyAccessToken,
  verifyAccessTokenDetailed,
} from "@/lib/tokens";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/lib/cookies";
import type { TokenPayload } from "@/lib/tokens";

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  "/api/user",
  "/api/auth/logout",
  "/api/auth/reset-password",
  "/api/gifts",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Explicit bypass: /api/auth/refresh must never be protected.
  // Middleware calls this endpoint internally for token refresh —
  // protecting it would create an infinite loop.
  if (pathname.startsWith("/api/auth/refresh")) {
    return NextResponse.next();
  }

  // Dashboard page route protection (cookie-based)
  if (pathname.startsWith("/dashboard")) {
    return handleDashboardRoute(request);
  }

  // API route protection (header-based with cookie fallback)
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedApi) {
    return handleApiRoute(request);
  }

  return NextResponse.next();
}

function injectUserHeaders(
  request: NextRequest,
  payload: TokenPayload,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function handleDashboardRoute(
  request: NextRequest,
): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Case 1: Access token present — check validity
  if (accessToken) {
    const result = verifyAccessTokenDetailed(accessToken);

    if (result.valid) {
      return injectUserHeaders(request, result.payload);
    }

    // Case 2: Access token expired + refresh token exists — attempt refresh
    if (result.expired && refreshToken) {
      return attemptTokenRefresh(request, refreshToken);
    }
  }

  // Case 3: No access token but refresh token exists — attempt refresh
  if (!accessToken && refreshToken) {
    return attemptTokenRefresh(request, refreshToken);
  }

  // Case 4: No valid tokens — redirect to login
  return redirectToLogin(request);
}

async function attemptTokenRefresh(
  request: NextRequest,
  refreshToken: string,
): Promise<NextResponse> {
  try {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    const refreshResponse = await fetch(refreshUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      const newAccessToken: string = data.data.accessToken;
      const newRefreshToken: string = data.data.refreshToken;

      // Verify the fresh access token to extract user payload
      const payload = verifyAccessToken(newAccessToken);
      if (payload) {
        const response = injectUserHeaders(request, payload);

        // Set updated cookies from the refreshed tokens
        response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
          ...COOKIE_OPTIONS,
          maxAge: ACCESS_TOKEN_MAX_AGE,
        });
        response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
          ...COOKIE_OPTIONS,
          maxAge: REFRESH_TOKEN_MAX_AGE,
        });

        return response;
      }
    }
  } catch (error) {
    console.error("[MIDDLEWARE] Token refresh failed:", error);
  }

  // Refresh failed — redirect to login
  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function handleApiRoute(request: NextRequest): NextResponse {
  // Primary: Authorization header (backward-compatible with existing API clients)
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    if (payload) {
      return injectUserHeaders(request, payload);
    }
  }

  // Fallback: Cookie-based auth (for browser-originated API calls)
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      return injectUserHeaders(request, payload);
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized: Missing or invalid token",
    },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/dashboard"],
};
