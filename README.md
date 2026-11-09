# FlowDesk

**Clareza para construir.** Um workspace pessoal para transformar ideias em entregas, desenvolvido por **Eric Ikeda**.

FlowDesk reúne tarefas, prazos, prioridades, projetos e indicadores em uma interface responsiva. O objetivo é demonstrar um fluxo full stack verificável: uma interação na interface passa por validação e autenticação no servidor, é persistida no PostgreSQL e atualiza o planejamento do usuário.

> Projeto de portfólio desenvolvido por Eric Ikeda. Banco PostgreSQL no Neon e aplicação preparada para hospedagem na Vercel.

## Experimente em dois minutos

1. Abra a aplicação e escolha **Experimentar demonstração**.
2. Cada acesso cria um usuário independente com cinco tarefas fictícias.
3. Crie uma tarefa e defina projeto, prazo e prioridade.
4. Mova o cartão entre as colunas ou use o seletor de status, inclusive no celular e pelo teclado.
5. Confira os indicadores, consulte o histórico e exporte as tarefas em CSV.

A sessão dura sete dias. Sem uma conta cadastrada, sair da demonstração impede recuperar aquele espaço pelo login. Os dados não são apagados automaticamente após sete dias: apenas a sessão expira.

## Funcionalidades

| Área         | O que está implementado                                                  |
| ------------ | ------------------------------------------------------------------------ |
| Conta        | Cadastro, login, logout e sessão persistida no banco                     |
| Demonstração | Usuário e tarefas de exemplo exclusivos por acesso                       |
| Dashboard    | Total, em andamento, concluídas, prazos vencidos e percentual de entrega |
| Kanban       | A fazer, em andamento, em revisão e concluído                            |
| Tarefas      | Criar, editar, excluir, prioridade, prazo e descrição                    |
| Organização  | Três categorias fixas de projeto: Website, Mobile e Plataforma           |
| Navegação    | Busca textual e filtro por projeto                                       |
| Interação    | Arrastar cartões no desktop e seletor de status acessível                |
| Histórico    | Registro de criação, edição, exclusão e mudança de status                |
| Dados        | Exportação CSV com proteção contra fórmulas                              |
| Interface    | Desktop, tablet, celular e respeito a movimento reduzido                 |

## Stack

- **Next.js 16 / React 19**: interface e rotas HTTP do backend.
- **TypeScript**: contratos e verificação estática.
- **PostgreSQL / Neon**: usuários, sessões, tarefas, atividades e limites de autenticação.
- **Neon serverless driver**: consultas SQL parametrizadas via HTTP.
- **Zod**: validação dos dados recebidos pelo servidor.
- **Node.js crypto**: scrypt para senhas e SHA-256 para tokens de sessão.
- **CSS responsivo e Lucide**: identidade visual e ícones.
- **Vercel**: destino preparado para deploy do frontend e das funções de backend.

**Neon hospeda o banco. A lógica do backend executa nas funções da Vercel.** Nenhuma conexão privilegiada com PostgreSQL é enviada ao navegador.

## Arquitetura

```mermaid
flowchart TD
    A[Interface React] --> B[Rotas HTTP Next.js]
    B --> C[Autenticação e validação]
    C --> D[Consultas parametrizadas]
    D --> E[PostgreSQL no Neon]
```

O frontend utiliza chamadas HTTP na mesma origem. O servidor lê um cookie HttpOnly, resolve o usuário pela sessão e aplica `user_id` nas consultas. Cada workspace pertence a uma conta. Não há compartilhamento de projetos entre pessoas nesta versão.

## Estrutura

```text
app/
  page.tsx               Interface e fluxos do workspace
  layout.tsx             Idioma e metadados
  globals.css            Tokens, layout e responsividade
  api/auth/route.ts      Cadastro, login, demonstração e logout
  api/tasks/route.ts     Leitura e mutações de tarefas
  api/activity/route.ts  Histórico do usuário autenticado
lib/
  auth.ts                Sessões e verificação de origem
  db.ts                  Conexão com Neon
  security.mjs           Senhas e tokens
  rate-limit.ts          Limites persistidos de autenticação
  validation.ts          Esquema das tarefas
scripts/dev.mjs          Execução local e adaptação da porta
schema.sql               Estrutura inicial idempotente do banco
tests/                   Testes de primitivas de autenticação
.github/workflows/ci.yml Testes e build automatizados
vercel.json              Região e cabeçalhos HTTP
```

## Executar localmente

Requisitos: Node.js 22 ou superior, npm e um banco PostgreSQL no Neon.

```bash
npm ci
cp .env.example .env.local
```

Edite `.env.local` apenas na sua máquina:

```dotenv
DATABASE_URL=postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require
```

Execute `schema.sql` no editor SQL do Neon. As instruções criam somente tabelas e índices ausentes. Para a aplicação, prefira a URL com pooling disponibilizada pelo Neon.

```bash
npm run dev
```

Abra `http://localhost:3000`. Para outra porta:

```bash
npm run dev -- --port 4173
```

O primeiro cadastro ou demonstração cria as tarefas de exemplo. Não existem credenciais de administrador embutidas.

## Banco de dados

| Tabela        | Responsabilidade                      |
| ------------- | ------------------------------------- |
| `users`       | Nome, e-mail único e hash de senha    |
| `sessions`    | Hash do token, dono e expiração       |
| `tasks`       | Tarefas pertencentes a um usuário     |
| `activities`  | Histórico vinculado ao usuário        |
| `auth_limits` | Contadores por janela de autenticação |

Tarefas, sessões e atividades possuem chave estrangeira para o usuário. Status, prioridade e projeto têm restrições também no PostgreSQL. Índices por usuário dão suporte à listagem das tarefas e do histórico.

O projeto Neon provisionado para este app se chama `flowdesk`, na região de São Paulo. Não use um banco de outro projeto sem revisar as tabelas existentes.

## API

Todas as respostas são JSON. As rotas de tarefas e histórico exigem uma sessão válida.

| Método | Rota            | Função                                 |
| ------ | --------------- | -------------------------------------- |
| GET    | `/api/auth`     | Retorna usuário atual ou `null`        |
| POST   | `/api/auth`     | `mode`: `register`, `login` ou `demo`  |
| DELETE | `/api/auth`     | Revoga a sessão e remove o cookie      |
| GET    | `/api/tasks`    | Lista somente as tarefas do usuário    |
| POST   | `/api/tasks`    | Cria uma tarefa                        |
| PATCH  | `/api/tasks`    | Atualiza uma tarefa pelo `id`          |
| DELETE | `/api/tasks`    | Exclui uma tarefa pelo `id`            |
| GET    | `/api/activity` | Retorna as 50 atividades mais recentes |

Exemplo de tarefa:

```json
{
  "title": "Revisar acessibilidade",
  "description": "Validar navegação por teclado",
  "project": "Website",
  "priority": "alta",
  "status": "review",
  "due_date": "2026-12-10"
}
```

`PATCH` recebe os mesmos campos e um `id` UUID. `DELETE` recebe `{ "id": "UUID" }`. A ausência de sessão retorna `401`; dados inválidos, `400`; tarefa ausente ou de outro usuário, `404`.

## Segurança e decisões técnicas

- Senhas recebem salt aleatório e scrypt; não são armazenadas em texto puro.
- Token de sessão aleatório de 32 bytes; apenas seu hash é persistido.
- Cookie HttpOnly, SameSite Lax, Secure em produção e expiração de sete dias.
- Consultas parametrizadas para evitar interpolação de valores no SQL.
- Autorização por proprietário nas operações de tarefas e atividades.
- Validação Zod e restrições no banco.
- Verificação de origem em métodos de escrita.
- Limite de 20 tentativas por 15 minutos por chave de IP e e-mail; demonstração usa limite por IP. Em produção, o IP deve vir dos cabeçalhos confiáveis da Vercel.
- Cabeçalhos contra enquadramento e detecção indevida de MIME.
- Exportação CSV trata valores que poderiam ser interpretados como fórmulas.
- `.env.local`, `node_modules` e artefatos de build não entram no repositório.

A aplicação é uma demonstração funcional, sem auditoria externa de segurança. O controle de acesso é aplicado no servidor; a conexão privilegiada não utiliza políticas de RLS por usuário no PostgreSQL.

## Qualidade

```bash
npm test
npm run typecheck
npm run build
```

Os testes automatizados cobrem verificação de senha, diferenciação de salts e geração/hash de tokens. O workflow de CI executa testes e build em pushes para `main` e pull requests.

A cobertura ainda não inclui toda a interface nem todas as rotas. Consulte `VALIDATION.md` para os resultados concretos da verificação desta entrega.

## Criar o repositório

Crie um repositório **vazio** chamado `FlowDesk` na conta desejada. Não adicione README, licença ou `.gitignore` pelo GitHub, pois eles já fazem parte do projeto.

```bash
git init -b main
git add .
git commit -m "feat: implement FlowDesk workspace"
git remote add origin https://github.com/EricIkeda1/FlowDesk.git
git push -u origin main
```

Autentique usando o fluxo normal do GitHub. Nunca coloque tokens no código ou no README.

## Deploy na Vercel

1. Importe o repositório na equipe correta.
2. Selecione o preset **Next.js** e Node.js **22.x**.
3. Cadastre `DATABASE_URL` como variável sensível no ambiente de produção.
4. Aplique `schema.sql` no banco Neon dedicado.
5. Execute o deploy e aguarde o estado **Ready**.
6. Confira cadastro, demonstração, criação de tarefa, persistência após recarregar e logout.

O arquivo `vercel.json` prepara as funções para `gru1`, próximo ao banco. Após vincular o repositório, a integração Git da Vercel pode publicar novos commits automaticamente. O workflow de testes é separado; ele não configura por si só bloqueios de deploy.

Para previews de mudanças de schema, use uma branch isolada no Neon em vez de alterar o banco de produção.

## Limitações e próximos passos

- Projetos são categorias fixas; ainda não há criação de projetos personalizados.
- Sem colaboração, convites, papéis de equipe ou atualizações em tempo real.
- Sem confirmação de e-mail ou recuperação de senha.
- Contas demo, sessões expiradas, atividades e contadores ainda não têm rotina de limpeza.
- Sem paginação na listagem de tarefas; adequado para workspaces pequenos.
- O histórico é gravado após a tarefa em uma segunda consulta; não há atomicidade entre essas duas operações nesta versão.
- Ícones e fontes utilizam Lucide e Google Fonts; as fontes possuem fallback local.
- Interface concentrada em `app/page.tsx`; separar telas e componentes é uma evolução recomendada.

Esses limites são explícitos para facilitar a avaliação técnica e orientar melhorias reais.

## Como apresentar em uma entrevista

“Desenvolvi o FlowDesk para organizar tarefas em um workspace privado. Implementei a interface responsiva com React e TypeScript, uma API autenticada no Next.js e persistência no PostgreSQL com Neon. Trabalhei validação, autorização por usuário, sessões seguras e um fluxo de demonstração que permite testar o produto sem cadastro.”

Demonstre uma tarefa indo da criação à conclusão, os indicadores atualizando e o histórico registrando a alteração. Explique também os limites e as próximas decisões de arquitetura.

## Autor e licença

**Eric Ikeda** · [Portfólio](https://www.ericyikeda.com.br/) · [GitHub](https://github.com/EricIkeda1)

Licença MIT. Veja `LICENSE`.
