import { count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { members, rooms } from "../../../db/schema";
import { getAllowedUser } from "../../allowed-users";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code() { return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""); }

export async function POST(request: Request) {
  const user = await getAllowedUser();
  if (!user) return Response.json({ error: "허용되지 않은 계정이에요." }, { status: 403 });
  const email = user.email.toLowerCase();
  const body = await request.json() as { action?: string; name?: string; inviteCode?: string };
  const name = body.name?.trim().slice(0, 10);
  if (!name) return Response.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  const db = getDb();
  const existing = await db.select().from(members).where(eq(members.email, email)).limit(1);
  if (existing.length) return Response.json({ error: "이미 참여 중인 방이 있어요. 새로고침해 주세요." }, { status: 409 });
  const now = new Date().toISOString();
  const deviceToken = crypto.randomUUID() + crypto.randomUUID();

  if (body.action === "create") {
    let inviteCode = code();
    for (let i = 0; i < 5; i++) {
      const exists = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.inviteCode, inviteCode)).limit(1);
      if (!exists.length) break;
      inviteCode = code();
    }
    const [room] = await db.insert(rooms).values({ inviteCode, createdAt: now }).returning();
    const [member] = await db.insert(members).values({ roomId: room.id, name, email, token: deviceToken, createdAt: now }).returning({ id: members.id, name: members.name });
    return Response.json({ roomCode: room.inviteCode, member });
  }

  const inviteCode = body.inviteCode?.trim().toUpperCase();
  const [room] = await db.select().from(rooms).where(eq(rooms.inviteCode, inviteCode ?? "")).limit(1);
  if (!room) return Response.json({ error: "방 코드를 찾을 수 없어요." }, { status: 404 });
  const [{ value }] = await db.select({ value: count() }).from(members).where(eq(members.roomId, room.id));
  if (value >= 2) return Response.json({ error: "이미 두 명이 참여한 방이에요." }, { status: 409 });
  const [member] = await db.insert(members).values({ roomId: room.id, name, email, token: deviceToken, createdAt: now }).returning({ id: members.id, name: members.name });
  return Response.json({ roomCode: room.inviteCode, member });
}
