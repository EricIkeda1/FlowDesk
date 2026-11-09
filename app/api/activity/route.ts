import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET() {
  try {
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    return NextResponse.json({
      activities:
        await db()`SELECT id,message,created_at FROM activities WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 50`,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar atividades" },
      { status: 503 },
    );
  }
}
