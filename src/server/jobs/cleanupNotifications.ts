import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function cleanupOldNotifications(): Promise<number> {
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);

  const result = await db
    .delete(notifications)
    .where(lt(notifications.createdAt, ninetyDaysAgo))
    .returning();

  console.log(
    `[NOTIFICATION_CLEANUP_JOB] Deleted ${result.length} notification records older than 90 days.`,
  );
  return result.length;
}

export function startNotificationCleanupJob() {
  console.log("[NOTIFICATION_CLEANUP_JOB] Starting notification cleanup job...");

  const run = async () => {
    try {
      await cleanupOldNotifications();
    } catch (error) {
      console.error("[NOTIFICATION_CLEANUP_JOB_ERROR]", error);
    }
  };

  run();
  setInterval(run, CLEANUP_INTERVAL_MS);
}

if (require.main === module) {
  cleanupOldNotifications()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
