import { env } from "cloudflare:workers";
import { getChatGPTUser } from "./chatgpt-auth";

/** 쉼표로 구분된 ALLOWED_EMAILS 환경변수에서 허용 계정 목록을 읽어옵니다. */
function getAllowedEmails() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const raw = runtimeEnv.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(email: string) {
  return getAllowedEmails().has(email.toLowerCase());
}

export async function getAllowedUser() {
  const user = await getChatGPTUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}
