import { db } from "./db";
import { hashToken } from "./security.mjs";
export async function allowAuth(req: Request, email: string) {
  const ip =
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const keys =
    email === "demo"
      ? [hashToken("ip:" + ip)]
      : [hashToken("ip:" + ip), hashToken("email:" + email.toLowerCase())];
  for (const key of keys) {
    const rows =
      await db()`INSERT INTO auth_limits(key,hits,reset_at) VALUES(${key},1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN auth_limits.reset_at<now() THEN 1 ELSE auth_limits.hits+1 END, reset_at=CASE WHEN auth_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_limits.reset_at END RETURNING hits`;
    if (rows[0].hits > 20) return false;
  }
  return true;
}
