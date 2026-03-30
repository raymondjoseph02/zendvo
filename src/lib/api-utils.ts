import { NextResponse } from "next/server";

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return NextResponse.json({ data, total, page, limit });
}

export function createProblemDetails(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance?: string,
  additionalData?: Record<string, unknown>,
) {
  const payload = {
    type,
    title,
    status,
    detail,
    ...(instance ? { instance } : {}),
    ...additionalData,
  };

  return NextResponse.json(payload, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}
