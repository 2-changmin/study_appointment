import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { members, plans } from "../../../db/schema";
import { currentMember } from "../_auth";
import { sendPlanCreatedPush } from "../../push";

export async function GET() {
  const member = await currentMember();
  if (!member) return Response.json({ error: "인증이 필요해요." }, { status: 401 });
  const db = getDb();
  const roomMembers = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.roomId, member.roomId));
  const rows = await db.select().from(plans).where(eq(plans.roomId, member.roomId)).orderBy(desc(plans.createdAt));
  const names = new Map(roomMembers.map((person) => [person.id, person.name]));
  return Response.json({ members: roomMembers, plans: rows.map((plan) => ({ ...plan, authorName: names.get(plan.authorId) ?? "친구" })) });
}

export async function POST(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "인증이 필요해요." }, { status: 401 });
  const body = await request.json() as { title?: string; details?: string; dueDate?: string };
  const title = body.title?.trim().slice(0, 50);
  if (!title || !body.dueDate) return Response.json({ error: "계획과 기한을 입력해 주세요." }, { status: 400 });
  const [plan] = await getDb().insert(plans).values({ roomId: member.roomId, authorId: member.id, title, details: body.details?.trim().slice(0, 180) ?? "", dueDate: body.dueDate, fine: 10000, createdAt: new Date().toISOString() }).returning();
  await sendPlanCreatedPush(member.roomId, member.id, member.name);
  return Response.json({ plan }, { status: 201 });
}
