import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { currentUser, sameOrigin } from "@/lib/auth";
import {
  passwordHash,
  passwordMatches,
  newToken,
  hashToken,
} from "@/lib/security.mjs";
import { z } from "zod";
import { allowAuth } from "@/lib/rate-limit";
export async function GET() {
  try {
    return NextResponse.json({ user: await currentUser() });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível conectar ao banco." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const data = z
      .object({
        mode: z.enum(["login", "register", "demo"]),
        email: z.string().email().max(254).optional(),
        password: z.string().min(8).max(128).optional(),
        name: z.string().trim().min(2).max(80).optional(),
      })
      .parse(await req.json());
    if (!(await allowAuth(req, data.email || "demo")))
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 15 minutos." },
        { status: 429 },
      );
    const sql = db();
    let user;
    if (data.mode === "demo") {
      const id = newToken().slice(0, 12);
      [user] =
        await sql`INSERT INTO users(name,email,password_hash) VALUES('Visitante',${id + "@demo.flowdesk.local"},${passwordHash(newToken())}) RETURNING id,name,email`;
    } else {
      if (!data.email || !data.password)
        return NextResponse.json(
          { error: "Preencha e-mail e senha (mínimo 8 caracteres)." },
          { status: 400 },
        );
      const email = data.email.toLowerCase();
      if (data.mode === "register") {
        if (!data.name)
          return NextResponse.json(
            { error: "Informe seu nome." },
            { status: 400 },
          );
        const existing = await sql`SELECT id FROM users WHERE email=${email}`;
        if (existing.length)
          return NextResponse.json(
            { error: "Não foi possível cadastrar esse e-mail. Tente entrar." },
            { status: 409 },
          );
        [user] =
          await sql`INSERT INTO users(name,email,password_hash) VALUES(${data.name},${email},${passwordHash(data.password)}) RETURNING id,name,email`;
      } else {
        const rows = await sql`SELECT * FROM users WHERE email=${email}`;
        if (!rows[0] || !passwordMatches(data.password, rows[0].password_hash))
          return NextResponse.json(
            { error: "E-mail ou senha incorretos." },
            { status: 401 },
          );
        user = rows[0];
      }
    }
    if (data.mode !== "login")
      await sql`INSERT INTO tasks(user_id,title,description,project,priority,status,due_date) VALUES (${user.id},'Criar a nova experiência de onboarding','Mapear o primeiro acesso e reduzir etapas do cadastro.','Plataforma','alta','progress',CURRENT_DATE+3),(${user.id},'Revisar acessibilidade do dashboard','Validar contraste, teclado e leitores de tela.','Website','alta','review',CURRENT_DATE+2),(${user.id},'Implementar notificações','Definir estados e preferências do usuário.','Mobile','média','backlog',CURRENT_DATE+7),(${user.id},'Documentar componentes','Organizar exemplos e decisões da interface.','Website','baixa','done',CURRENT_DATE-1),(${user.id},'Otimizar carregamento inicial','Analisar bundle e imagens da aplicação.','Plataforma','média','backlog',CURRENT_DATE+5)`;
    const token = newToken();
    await sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${hashToken(token)},${user.id},now()+interval '7 days')`;
    (await cookies()).set("flowdesk_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Verifique os campos informados."
            : "Não foi possível entrar. Tente novamente.",
      },
      { status: e instanceof z.ZodError ? 400 : 500 },
    );
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const c = await cookies();
  const token = c.get("flowdesk_session")?.value;
  if (token)
    await db()`DELETE FROM sessions WHERE token_hash=${hashToken(token)}`;
  c.delete("flowdesk_session");
  return NextResponse.json({ ok: true });
}
