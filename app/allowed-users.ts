import { env } from "cloudflare:workers";
import { getChatGPTUser } from "./chatgpt-auth";

// 허용 계정을 이메일 평문 대신 SHA-256 해시로 보관합니다. 저장소에 실제 주소가
// 남지 않으면서, 배포 환경에 별도 설정을 하지 않아도 동작합니다.
// 계정을 추가하려면 아래 명령으로 해시를 만들어 목록에 넣으세요.
//   node -e "console.log(require('crypto').createHash('sha256').update('주소'.toLowerCase()).digest('hex'))"
const ALLOWED_EMAIL_HASHES = new Set([
  "2125651a9c6938230c9e39d5c43b55cfecd1e852a310fa4864ea6b7d36a9d377",
  "bdfb7dc831a102d9dab53865eb8e0cd28c7002efeaa5f26f91f095866f0cae85",
]);

/** 쉼표로 구분된 ALLOWED_EMAILS 환경변수. 지정되어 있으면 해시 목록보다 우선합니다. */
function getAllowedEmailsFromEnv() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const raw = runtimeEnv.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAllowedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const fromEnv = getAllowedEmailsFromEnv();
  if (fromEnv.size) return fromEnv.has(normalized);
  return ALLOWED_EMAIL_HASHES.has(await sha256Hex(normalized));
}

export async function getAllowedUser() {
  const user = await getChatGPTUser();
  if (!user || !(await isAllowedEmail(user.email))) return null;
  return user;
}
