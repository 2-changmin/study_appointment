import { env } from "cloudflare:workers";
import { eq, inArray, ne } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "../db";
import { members, pushSubscriptions } from "../db/schema";

type PushError = Error & { statusCode?: number };

function vapidConfig() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const publicKey = runtimeEnv.VAPID_PUBLIC_KEY;
  const privateKey = runtimeEnv.VAPID_PRIVATE_KEY;
  const subject = runtimeEnv.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { subject, publicKey, privateKey };
}

export function getVapidPublicKey() {
  return vapidConfig()?.publicKey ?? null;
}

export async function sendPlanCreatedPush(roomId: number, authorId: number, authorName: string) {
  const vapidDetails = vapidConfig();
  if (!vapidDetails) return;
  const db = getDb();
  const recipients = await db.select({ id: members.id }).from(members).where(eq(members.roomId, roomId));
  const recipientIds = recipients.map((item) => item.id).filter((id) => id !== authorId);
  if (!recipientIds.length) return;
  const subscriptions = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.memberId, recipientIds));
  const payload = JSON.stringify({
    title: "약속메이트",
    body: `${authorName}님이 새 계획을 올렸어요. 확인하고 승인해 주세요.`,
    url: "/",
    tag: "new-plan",
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { vapidDetails, TTL: 60 * 60, urgency: "normal" });
    } catch (error) {
      const status = (error as PushError).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      }
    }
  }));
}
