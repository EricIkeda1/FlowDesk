import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken } from "./security.mjs";
export async function currentUser() {
  const token = (await cookies()).get("flowdesk_session")?.value;
  if (!token) return null;
  const rows =
    await db()`SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now()`;
  return rows[0] ?? null;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      origin === new URL(req.url).origin ||
      url.host === req.headers.get("host") ||
      (process.env.NODE_ENV !== "production" &&
        url.origin === "http://terminal.local:4173")
    );
  } catch {
    return false;
  }
}
