/**
 * Service to handle mobile and web push notifications.
 * Currently implemented as a stub for clean architecture.
 * Future integration points: Firebase Cloud Messaging (FCM) or OneSignal.
 */

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
) {
  // In development, log the push payload to the console
  if (process.env.NODE_ENV === "development") {
    console.log("\n" + "=".repeat(50));
    console.log("📱 PUSH NOTIFICATION DISPATCHED (Development Mode)");
    console.log("=".repeat(50));
    console.log(`To User ID: ${userId}`);
    console.log(`Title:      ${title}`);
    console.log(`Body:       ${body}`);
    if (metadata) {
      console.log(`Metadata:   ${JSON.stringify(metadata, null, 2)}`);
    }
    console.log("=".repeat(50) + "\n");
    
    return {
      success: true,
      message: "Push Payload dispatched (Stub)",
      provider: "stub",
    };
  }

  // TODO: Implement live push notification provider (Firebase/OneSignal)
  // For now, we return a success for non-development environments to avoid breaking flows
  return {
    success: true,
    message: "Push notification logic skipped (Stub)",
    provider: "stub",
  };
}
