/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (both dev and production)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { checkMigrationStatus } from "./lib/db/migration-checker";
import { startNotificationCleanupJob } from "./server/jobs/cleanupNotifications";

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🔍 Checking database migration status...");

    try {
      const status = await checkMigrationStatus();

      if (status.inSync) {
        console.log(status.message);
      } else {
        console.error(status.message);
        console.error(
          "⚠️  Server will continue, but database operations may fail."
        );
        console.error(
          "   Run 'npm run db:migrate' or 'npx drizzle-kit push' to sync the database."
        );

        // Optionally halt startup in production if migrations are out of sync
        if (process.env.NODE_ENV === "production" && process.env.STRICT_MIGRATION_CHECK === "true") {
          console.error("❌ STRICT_MIGRATION_CHECK enabled. Halting startup.");
          process.exit(1);
        }
      }
    } catch (error) {
      console.error("❌ Failed to check migration status:", error);
      console.error("⚠️  Server will continue, but this should be investigated.");
    }

    startNotificationCleanupJob();
  }
}
