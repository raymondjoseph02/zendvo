import { z } from "zod";

// E.164: +<country-code><subscriber-number>, 2–15 digits after +, no leading 0
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export const phoneField = z
  .string()
  .trim()
  .regex(E164_REGEX, "Must be a valid E.164 phone number (e.g. +14155552671)");

export type PhoneNumber = z.infer<typeof phoneField>;

export const phoneSchema = z.object({ phone: phoneField });
export type PhoneSchema = z.infer<typeof phoneSchema>;

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "At least 2 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address"),
  phone: phoneField,
  password: z
    .string()
    .min(8, "At least 8 characters"),
});
export type SignUpSchema = z.infer<typeof signUpSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "At least 2 characters").optional(),
  phone: phoneField.optional(),
});
export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;

export const isValidE164 = (value: unknown): value is PhoneNumber =>
  phoneField.safeParse(value).success;