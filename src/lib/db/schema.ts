import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("User", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("passwordHash").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  loginAttempts: integer("loginAttempts").notNull(),
  lockUntil: integer("lockUntil", { mode: "timestamp_ms" }),
  lastLogin: integer("lastLogin", { mode: "timestamp_ms" }),
  name: text("name"),
});

export const refreshTokens = sqliteTable("RefreshToken", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  token: text("token").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }),
  revokedAt: integer("revokedAt", { mode: "timestamp_ms" }),
  deviceInfo: text("deviceInfo"),
});
