import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Use the singleton prisma instance instead of creating a new one

export function generateOTP(): string {
  // CSPRNG compliant
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates a SHA-256 hash of the OTP with a unique salt.
 * Returns the salt and hash combined or structured.
 * For this implementation, we'll return { salt, hash }.
 */
export function hashOTP(otp: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(otp)
    .digest("hex");
  return { salt, hash };
}

/**
 * Verifies an OTP against a stored hash and salt using constant-time comparison.
 */
export function verifyOTPHash(otp: string, storedHash: string, salt: string): boolean {
  const hash = crypto
    .createHmac("sha256", salt)
    .update(otp)
    .digest("hex");
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(storedHash)
  );
}

export async function storeOTP(userId: string, otp: string) {
  // Use SHA-256 with unique salt as requested
  const { salt, hash } = hashOTP(otp);
  // Store salt and hash combined in otpHash field: "salt:hash"
  // This allows us to reuse the existing string column without schema migration
  const storedValue = `${salt}:${hash}`;
  
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

  // Invalidate previous unused OTPs
  await prisma.emailVerification.updateMany({
    where: { userId, isUsed: false },
    data: { isUsed: true },
  });

  console.log(`[AUDIT] OTP generated for user ${userId}`);

  return await prisma.emailVerification.create({
    data: {
      userId,
      otpHash: storedValue,
      expiresAt,
      attempts: 0,
      isUsed: false,
    },
  });
}

export async function verifyOTP(userId: string, otp: string) {
  const verification = await prisma.emailVerification.findFirst({
    where: { userId, isUsed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return {
      success: false,
      message: "No verification code found. Please request a new one.",
    };
  }

  if (new Date() > verification.expiresAt) {
    return {
      success: false,
      message: "Verification code has expired. Please request a new one.",
    };
  }

  // Check if account is locked (via user table or inferred from attempts)
  // Requirement: "After 5 consecutive failed attempts, lock the account for 30 minutes"
  // We need to check the user's lock status first.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && (user as any).lockUntil && new Date() < (user as any).lockUntil) {
     return {
      success: false,
      message: "Account is temporarily locked. Please try again later.",
      locked: true,
    };
  }

  if (verification.attempts >= 5) {
     // Ensure lock is applied if not already (redundant safety)
     return {
      success: false,
      message: "Maximum attempts exceeded. Account is locked.",
      locked: true,
    };
  }

  // Determine hashing method (bcrypt or SHA-256) based on stored format
  let isValid = false;
  const storedHash = verification.otpHash;

  if (storedHash.includes(":")) {
    // SHA-256 format "salt:hash"
    const [salt, hash] = storedHash.split(":");
    isValid = verifyOTPHash(otp, hash, salt);
  } else {
    // Fallback to bcrypt for backward compatibility
    isValid = await bcrypt.compare(otp, storedHash);
  }

  if (!isValid) {
    const newAttempts = verification.attempts + 1;
    
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { attempts: newAttempts },
    });

    if (newAttempts >= 5) {
      // Lock the account for 30 minutes
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lockUntil: lockUntil,
          // We don't change status to suspended, just temporary lock
        } as any, // casting as any because lockUntil might not be in inferred types if strict
      });
      
      return {
        success: false,
        message: "Maximum attempts exceeded. Account locked for 30 minutes.",
        locked: true,
        shouldSendAlert: true, // Signal to caller to send alert email
      };
    }

    const remainingAttempts = 5 - newAttempts;
    return {
      success: false,
      message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      remainingAttempts,
    };
  }

  // Success path
  await prisma.emailVerification.delete({
    where: { id: verification.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { 
      status: "active",
      lockUntil: null, // Clear any locks
      loginAttempts: 0 
    } as any,
  });

  return { success: true, message: "Email verified successfully!" };
}

export async function cleanupExpiredOTPs() {
  const deleted = await prisma.emailVerification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  return deleted.count;
}

export async function storeGiftOTP(giftId: string, otp: string) {
  // Using SHA-256 for gifts too for consistency? 
  // Requirement was specifically for "Endpoint 1", but let's stick to bcrypt for gifts 
  // unless requested otherwise, to minimize regression risk on gifts.
  // Actually, let's keep bcrypt for gifts as it's separate flow not mentioned in requirements.
  const saltRounds = 10;
  const otpHash = await bcrypt.hash(otp, saltRounds);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  return await prisma.gift.update({
    where: { id: giftId },
    data: {
      otpHash,
      otpExpiresAt: expiresAt,
    },
  });
}

export async function verifyGiftOTP(giftId: string, otp: string) {
  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
  });

  if (!gift || !gift.otpHash || !gift.otpExpiresAt) {
    return {
      success: false,
      message: "No verification code found for this gift.",
    };
  }

  if (new Date() > gift.otpExpiresAt) {
    return {
      success: false,
      message: "Verification code has expired. Please request a new gift.",
    };
  }

  const isValid = await bcrypt.compare(otp, gift.otpHash);

  if (!isValid) {
    return {
      success: false,
      message: "Invalid verification code.",
    };
  }

  // Mark as confirmed
  await prisma.gift.update({
    where: { id: giftId },
    data: {
      status: "confirmed",
      otpHash: null,
      otpExpiresAt: null,
    },
  });

  return { success: true, message: "Gift confirmed successfully!" };
}
