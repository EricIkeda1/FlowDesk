import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema } from "@/lib/validation";
import { z } from "zod";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: "Entre para continuar." },
        { status: 401 },
      );
    return NextResponse.json({
      tasks:
        await db()`SELECT * FROM tasks WHERE user_id=${user.id} ORDER BY created_at DESC`,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar tarefas." },
      { status: 503 },
    );
  }
}
async function mutate(req: Request, method: string) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const body = await req.json();
    const sql = db();
    let rows;
    if (method === "DELETE") {
      const id = z.string().uuid().parse(body.id);
      rows =
        await sql`DELETE FROM tasks WHERE id=${id} AND user_id=${user.id} RETURNING title`;
    } else {
      const d = taskSchema.parse(body);
      if (method === "POST") {
        rows =
          await sql`INSERT INTO tasks(user_id,title,description,project,priority,status,due_date) VALUES(${user.id},${d.title},${d.description},${d.project},${d.priority},${d.status},${d.due_date}) RETURNING *`;
      } else {
        const id = z.string().uuid().parse(body.id);
        rows =
          await sql`UPDATE tasks SET title=${d.title},description=${d.description},project=${d.project},priority=${d.priority},status=${d.status},due_date=${d.due_date},updated_at=now() WHERE id=${id} AND user_id=${user.id} RETURNING *`;
      }
    }
    if (!rows.length)
      return NextResponse.json(
        { error: "Tarefa não encontrada." },
        { status: 404 },
      );
    await sql`INSERT INTO activities(user_id,message) VALUES(${user.id},${(method === "POST" ? "Criou" : method === "DELETE" ? "Excluiu" : "Atualizou") + " a tarefa “" + rows[0].title + "”"})`;
    return NextResponse.json({ task: rows[0] });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Dados inválidos. Confira os campos."
            : "Não foi possível salvar a alteração.",
      },
      { status: e instanceof z.ZodError ? 400 : 500 },
    );
  }
}
export const POST = (r: Request) => mutate(r, "POST");
export const PATCH = (r: Request) => mutate(r, "PATCH");
export const DELETE = (r: Request) => mutate(r, "DELETE");
