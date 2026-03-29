import { db } from "@/lib/db";
import { webhookRetryQueue } from "@/lib/db/schema";

export async function enqueueWebhookRetry(params: {
  eventType: string;
  payload: unknown;
  delayMs?: number;
}) {
  const now = new Date();

  await db.insert(webhookRetryQueue).values({
    eventType: params.eventType,
    payload: params.payload,

    retryCount: 0,
    maxRetries: 5,

    nextAttemptAt: new Date(
      now.getTime() + (params.delayMs ?? 5000)
    ),
  });
}