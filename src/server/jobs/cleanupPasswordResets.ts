import { db } from "@/lib/db";
import { passwordResets } from "@/lib/db/schema";
import { or, lt, isNotNull } from "drizzle-orm";
import { isPostgresBusyError } from "@/lib/isPostgresBusy";
import { enqueueWebhookRetry } from "../services/webhookRetryService";

export async function cleanupExpiredTokens() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .delete(passwordResets)
      .where(
        or(
          lt(passwordResets.expiresAt, new Date()),
          lt(passwordResets.createdAt, twentyFourHoursAgo),
          isNotNull(passwordResets.usedAt),
        ),
      )
      .returning();

    console.log(
      `[CLEANUP_JOB] Deleted ${result.length} expired/used password reset tokens.`,
    );
    return result.length;
  } catch (error) {
    if (isPostgresBusyError(error)) {
      console.warn("Postgres busy — queueing webhook");
    console.error("[CLEANUP_JOB_ERROR]", error);
    await enqueueWebhookRetry({
      eventType: "EXPIRED_PASSWORD_RESET",
      payload: {}, // payload to retry the cleanup task
      delayMs: 5 * 60 * 1000, // retry after 5 minutes
    })
    // throw error;
    }
  }
}

if (require.main === module) {
  cleanupExpiredTokens()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
