import { db } from "@/lib/db";
import { webhookRetryQueue } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const POLL_INTERVAL = 5000;
const BATCH_SIZE = 10;

 const  fetchQueueBatch = async () => {
  return db.execute(sql`
    SELECT *
    FROM webhook_retry_queue
    WHERE next_attempt_at <= NOW()
    ORDER BY next_attempt_at ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `);
}

async function processQueueItem(item: any) {
  try {
    await processWebhookEvent(item.event_type, item.payload);

    // success → delete
    await db.execute(sql`
      DELETE FROM webhook_retry_queue WHERE id = ${item.id}
    `);

  } catch (error) {
    await scheduleRetry(item, error);
  }
}

// Placeholder for actual webhook processing logic
async function processWebhookEvent(eventType: string, payload: unknown) {
  console.log(`Processing webhook event: ${eventType}`, payload);
  
  // Simulate random failure for demonstration
    if (Math.random() < 0.5) {
      throw new Error("Simulated webhook processing error");
    }
  }

async function scheduleRetry(item: any, error: unknown) {
  const retryCount = item.retry_count + 1;

  if (retryCount >= item.max_retries) {
    console.error("Max retries exceeded:", item.id);

    await db.execute(sql`
      DELETE FROM webhook_retry_queue WHERE id = ${item.id}
    `);
    return;
  }

  const backoff = Math.min(60_000, 2 ** retryCount * 1000);

  await db.execute(sql`
    UPDATE webhook_retry_queue
    SET 
      retry_count = ${retryCount},
      next_attempt_at = NOW() + (${backoff} || ' milliseconds')::interval,
      last_error = ${error instanceof Error ? error.message : "Unknown error"},
      updated_at = NOW()
    WHERE id = ${item.id}
  `);
}

async function processWebhookQueue() {
  const result = await fetchQueueBatch();

  // drizzle returns rows differently depending on driver
  const items = result.rows ?? result;

  for (const item of items) {
    await processQueueItem(item);
  }
}

export function startWebhookRetryWorker() {
  console.log("Starting Postgres webhook retry worker...");

  setInterval(async () => {
    try {
      await processWebhookQueue();
    } catch (err) {
      console.error("Retry worker error:", err);
    }
  }, POLL_INTERVAL);
}