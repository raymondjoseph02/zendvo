import { sendPushNotification } from "../src/server/services/pushNotificationService";

async function verify() {
  process.env.NODE_ENV = "development";
  console.log("Starting push notification verification...");
  
  await sendPushNotification(
    "user_123",
    "Test Title",
    "Test Body",
    { foo: "bar" }
  );
  
  console.log("Verification completed.");
}

verify().catch(console.error);
