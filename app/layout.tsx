import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FlowDesk | Clareza para construir",
  description:
    "Seu espaço para transformar planos em entregas. Projetos, tarefas e indicadores em uma experiência simples. Desenvolvido por Eric Ikeda.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
