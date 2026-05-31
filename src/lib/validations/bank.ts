import { z } from "zod";

export const addBankAccountSchema = z.object({
  country: z.string().min(2, "Country is required"),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  swiftBic: z
    .string()
    .min(8, "SWIFT/BIC must be at least 8 characters")
    .max(11, "SWIFT/BIC must be at most 11 characters"),
  accountNumber: z.string().min(5, "Account number is required"),
});

export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
