import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { plans } from "../../../../db/schema";
import { currentMember } from "../../_auth";

async function ownedPlan(id: number) {
  const member = await currentMember();
  if (!member) return { error: Response.json({ error: "인증이 필요해요." }, { status: 401 }) };
  const [plan] = await getDb().select().from(plans).where(and(
    eq(plans.id, id),
    eq(plans.roomId, member.roomId),
  )).limit(1);
  if (!plan) return { error: Response.json({ error: "계획을 찾을 수 없어요." }, { status: 404 }) };
  if (plan.authorId !== member.id) return { error: Response.json({ error: "본인이 작성한 계획만 변경할 수 있어요." }, { status: 403 }) };
  return { member, plan };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedPlan(Number(id));
  if (owned.error) return owned.error;
  const body = await request.json() as { title?: string; details?: string; dueDate?: string };
  const title = body.title?.trim().slice(0, 50);
  const dueDate = body.dueDate?.trim();
  if (!title || !dueDate) return Response.json({ error: "계획과 기한을 입력해 주세요." }, { status: 400 });
  const [plan] = await getDb().update(plans).set({
    title,
    details: body.details?.trim().slice(0, 180) ?? "",
    dueDate,
    status: "pending",
    approvedBy: null,
  }).where(eq(plans.id, owned.plan!.id)).returning();
  return Response.json({ plan });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedPlan(Number(id));
  if (owned.error) return owned.error;
  await getDb().delete(plans).where(eq(plans.id, owned.plan!.id));
  return new Response(null, { status: 204 });
}
