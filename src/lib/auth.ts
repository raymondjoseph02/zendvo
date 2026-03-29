import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/tokens";

const SALT_ROUNDS = 10;

export type AccountType = "Sender" | "Recipient";

export const getAccountTypeFromRole = (
  role: UserRole | string | null | undefined,
): AccountType | null => {
  if (!role) {
    return null;
  }

  const normalized = role.toLowerCase();
  if (normalized === "sender") {
    return "Sender";
  }

  if (normalized === "recipient") {
    return "Recipient";
  }

  return null;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
