import { env } from "cloudflare:workers";
import { eq, inArray, ne } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "../db";
import { members, pushSubscriptions } from "../db/schema";

type PushError = Error & { statusCode?: number };

// 푸시 서비스가 문제 발생 시 연락할 주소. 개인 이메일 대신 사이트 주소를 씁니다.
// VAPID 규격은 mailto: 와 https: 를 모두 허용합니다.
const DEFAULT_VAPID_SUBJECT = "https://yaksok-mate.leeyoonpaeng.chatgpt.site";

function vapidConfig() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const publicKey = runtimeEnv.VAPID_PUBLIC_KEY;
  const privateKey = runtimeEnv.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { subject: runtimeEnv.VAPID_SUBJECT ?? DEFAULT_VAPID_SUBJECT, publicKey, privateKey };
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
