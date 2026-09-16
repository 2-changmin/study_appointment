import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { plans } from "../../../../../db/schema";
import { currentMember } from "../../../_auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "인증이 필요해요." }, { status: 401 });
  const { id } = await params;
  const [plan] = await getDb().select().from(plans).where(and(eq(plans.id, Number(id)), eq(plans.roomId, member.roomId))).limit(1);
  if (!plan) return Response.json({ error: "계획을 찾을 수 없어요." }, { status: 404 });
  if (plan.authorId === member.id) return Response.json({ error: "내 계획은 직접 승인할 수 없어요." }, { status: 403 });
  const [updated] = await getDb().update(plans).set({ status: "approved", approvedBy: member.id }).where(eq(plans.id, plan.id)).returning();
  return Response.json({ plan: updated });
}
