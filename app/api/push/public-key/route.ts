import { getAllowedUser } from "../../../allowed-users";
import { getVapidPublicKey } from "../../../push";

export async function GET() {
  if (!await getAllowedUser()) return Response.json({ error: "허용되지 않은 계정이에요." }, { status: 403 });
  const publicKey = getVapidPublicKey();
  if (!publicKey) return Response.json({ error: "알림 설정을 준비하고 있어요." }, { status: 503 });
  return Response.json({ publicKey });
}
