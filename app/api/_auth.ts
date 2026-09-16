import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { members } from "../../db/schema";
import { getAllowedUser } from "../allowed-users";

export async function currentMember() {
  const user = await getAllowedUser();
  if (!user) return null;
  const [member] = await getDb().select().from(members).where(eq(members.email, user.email.toLowerCase())).limit(1);
  return member ?? null;
}
