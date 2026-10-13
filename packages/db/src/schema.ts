import type { AdapterAccount } from "@auth/core/adapters"
import { relations, sql } from "drizzle-orm"
import {
  index,
  int,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

export const Post = sqliteTable("post", () => ({
  id: int("id").notNull().primaryKey(),
  title: text("title", { length: 255 }).notNull(),
  content: text().notNull(),
  createdAt: int("createdAt", {
    mode: "timestamp",
  }),
  updatedAt: int("updatedAt", {
    mode: "timestamp",
  }).default(sql`(unixepoch())`),
}))

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const User = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name", { length: 255 }),
  email: text("email", { length: 255 }).notNull(),
  emailVerified: int("emailVerified", {
    mode: "timestamp",
  }).default(sql`(unixepoch())`),
  image: text("image", { length: 255 }),
})

export const UsersRelations = relations(User, ({ many }) => ({
  accounts: many(Account),
}))

export const Account = sqliteTable(
  "account",
  {
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => User.id),
    type: text("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: text("provider", { length: 255 }).notNull(),
    providerAccountId: text("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refreshToken"),
    access_token: text("accessToken"),
    expires_at: int("expiresAt"),
    token_type: text("tokenType", { length: 255 }),
    scope: text("scope", { length: 255 }),
    id_token: text("idToken"),
    session_state: text("sessionState", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  }),
)
export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}))

export const Session = sqliteTable(
  "session",
  {
    sessionToken: text("sessionToken", { length: 255 }).notNull().primaryKey(),
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => User.id),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  }),
)
export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}))

// An ephemeral, PKCE-bound handoff. Never exposed through the public API.
export const NativeAuthGrant = sqliteTable("native_auth_grant", {
  id: text("id").notNull().primaryKey(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  clientState: text("client_state").notNull(),
  expires: int("expires", { mode: "timestamp" }).notNull(),
  sessionToken: text("session_token"),
})
