import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  email: text("email").unique(),
  createdAt: text("created_at").notNull(),
});

export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  authorId: integer("author_id").notNull().references(() => members.id),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  dueDate: text("due_date").notNull(),
  status: text("status", { enum: ["pending", "approved"] }).notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => members.id),
  fine: integer("fine").notNull().default(10000),
  createdAt: text("created_at").notNull(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
});
