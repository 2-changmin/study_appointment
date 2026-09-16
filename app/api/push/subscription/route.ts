import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { pushSubscriptions } from "../../../../db/schema";
import { currentMember } from "../../_auth";

type SubscriptionPayload = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

function validEndpoint(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function POST(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "먼저 방에 참여해 주세요." }, { status: 401 });
  const body = await request.json() as SubscriptionPayload;
  const endpoint = body.endpoint?.slice(0, 2048) ?? "";
  const p256dh = body.keys?.p256dh?.slice(0, 512) ?? "";
  const auth = body.keys?.auth?.slice(0, 256) ?? "";
  if (!validEndpoint(endpoint) || !p256dh || !auth) return Response.json({ error: "올바르지 않은 알림 구독정보예요." }, { status: 400 });
  await getDb().insert(pushSubscriptions).values({ memberId: member.id, endpoint, p256dh, auth, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { memberId: member.id, p256dh, auth } });
  return Response.json({ enabled: true });
}

export async function DELETE(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "인증이 필요해요." }, { status: 401 });
  const body = await request.json() as { endpoint?: string };
  if (body.endpoint) await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, body.endpoint), eq(pushSubscriptions.memberId, member.id)));
  return Response.json({ enabled: false });
}
