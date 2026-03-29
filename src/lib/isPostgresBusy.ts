// src/server/lib/isPostgresBusy.ts
export function isPostgresBusyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; message?: string };

  if (
    // Serialization failure (common with high concurrency)
    err.code === "40001" ||

    // Deadlock detected
    err.code === "40P01" ||

    // Too many connections / resource issues
    err.code === "53300" ||

    // Fallback message checks (driver-specific)
    err.message?.includes("deadlock detected") ||
    err.message?.includes("could not serialize access")
  ){
    return true
  }

  return false
}