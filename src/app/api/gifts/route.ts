import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateAmount,
  validateCurrency,
  sanitizeInput,
} from "@/lib/validation";
import { generateOTP, storeGiftOTP } from "@/server/services/otpService";
import { sendGiftConfirmationOTP } from "@/server/services/emailService";

export async function GET() {
  return NextResponse.json({ gifts: [] });
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { recipient, amount, currency, message, template } = body;

    // Validate required fields
    if (!recipient || !amount || !currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipient, amount, and currency are required",
        },
        { status: 400 },
      );
    }

    // Validate amount
    if (typeof amount !== "number" || !validateAmount(amount)) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number within allowed limits",
        },
        { status: 422 },
      );
    }

    // Validate currency
    if (typeof currency !== "string" || !validateCurrency(currency)) {
      return NextResponse.json(
        { success: false, error: "Invalid currency" },
        { status: 422 },
      );
    }

    // Check if recipient exists
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipient },
    });

    if (!recipientUser) {
      return NextResponse.json(
        { success: false, error: "Recipient not found" },
        { status: 404 },
      );
    }

    // Prevent sending gift to self
    if (recipient === userId) {
      return NextResponse.json(
        { success: false, error: "Cannot send gift to yourself" },
        { status: 422 },
      );
    }

    // Sanitize optional fields
    const sanitizedMessage = message ? sanitizeInput(message) : null;
    const sanitizedTemplate = template ? sanitizeInput(template) : null;

    // Create gift record
    const gift = await prisma.gift.create({
      data: {
        senderId: userId,
        recipientId: recipient,
        amount,
        currency: currency.toUpperCase(),
        message: sanitizedMessage,
        template: sanitizedTemplate,
        status: "pending_otp",
      },
    });

    // Generate and store OTP
    const otp = generateOTP();
    await storeGiftOTP(gift.id, otp);

    // Send OTP to sender
    const emailResult = await sendGiftConfirmationOTP(
      userEmail,
      otp,
      recipientUser.name || undefined,
    );

    if (!emailResult.success) {
      // If email fails, we could delete the gift or mark it as failed
      // For now, we'll proceed but log the error
      console.error(
        "Failed to send gift confirmation OTP:",
        emailResult.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        giftId: gift.id,
        status: "pending_otp",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating gift:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
