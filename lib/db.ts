import { neon } from "@neondatabase/serverless";
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Banco não configurado");
  return neon(process.env.DATABASE_URL);
}
