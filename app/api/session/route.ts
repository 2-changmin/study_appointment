import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { members, rooms } from "../../../db/schema";
import { currentMember } from "../_auth";

export async function GET() {
  const member = await currentMember();
  if (!member) return Response.json({ error: "아직 참여한 방이 없어요." }, { status: 404 });
  const [room] = await getDb().select({ roomCode: rooms.inviteCode }).from(rooms).where(eq(rooms.id, member.roomId)).limit(1);
  return Response.json({ roomCode: room.roomCode, member: { id: member.id, name: member.name } });
}
