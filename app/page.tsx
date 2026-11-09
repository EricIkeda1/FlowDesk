"use client";
import { useEffect, useState } from "react";
import {
  Layers,
  LayoutDashboard,
  Columns3,
  FolderKanban,
  Activity,
  Settings,
  LogOut,
  Plus,
  Search,
  ArrowUpRight,
  Check,
  Clock,
  Ellipsis,
  X,
  Download,
  ChevronRight,
  ArrowRight,
  Menu,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
type Task = {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at?: string;
};
type User = { id: string; name: string; email: string };
const columns = [
  { id: "backlog", name: "A fazer", color: "#9498a6" },
  { id: "progress", name: "Em andamento", color: "#7770ed" },
  { id: "review", name: "Em revisão", color: "#e7ab43" },
  { id: "done", name: "Concluído", color: "#45ac8d" },
];
const blank = {
  title: "",
  description: "",
  project: "Website",
  priority: "média",
  status: "backlog",
  due_date: "",
};
export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [tasks, setTasks] = useState<Task[]>([]),
    [view, setView] = useState("Visão geral"),
    [query, setQuery] = useState(""),
    [project, setProject] = useState("Todos"),
    [modal, setModal] = useState(false),
    [edit, setEdit] = useState<Task | null>(null),
    [form, setForm] = useState(blank),
    [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [activities, setActivities] = useState<
      { id: string; message: string; created_at: string }[]
    >([]),
    [mobile, setMobile] = useState(false);
  async function api(path: string, options?: RequestInit) {
    const r = await fetch("/api/" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!r.headers.get("content-type")?.includes("application/json"))
      throw new Error("Servidor indisponível. Tente novamente em instantes.");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Não foi possível concluir.");
    return d;
  }
  async function load() {
    const d = await api("tasks");
    setTasks(d.tasks);
  }
  useEffect(() => {
    api("auth")
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (user) load().catch((e) => setError(e.message));
  }, [user]);
  useEffect(() => {
    if (view === "Atividades" && user)
      api("activity")
        .then((d) => setActivities(d.activities))
        .catch((e) => setError(e.message));
  }, [view, user]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(false);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await authenticate({
      mode,
      email: data.get("email"),
      password: data.get("password"),
      name: data.get("name"),
    });
  }
  async function authenticate(body: object) {
    setBusy(true);
    setError("");
    try {
      const d = await api("auth", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setUser(d.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(t?: Task) {
    setEdit(t || null);
    setForm(t ? { ...t, due_date: t.due_date?.slice(0, 10) || "" } : blank);
    setError("");
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("tasks", {
        method: edit ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          id: edit?.id,
          due_date: form.due_date || null,
        }),
      });
      await load();
      setModal(false);
      setNotice(edit ? "Tarefa atualizada" : "Tarefa criada");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function move(t: Task, status: string) {
    try {
      await api("tasks", {
        method: "PATCH",
        body: JSON.stringify({
          ...t,
          status,
          due_date: t.due_date?.slice(0, 10) || null,
        }),
      });
      await load();
      setNotice("Status atualizado");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (
      !edit ||
      !confirm("Excluir esta tarefa? Essa ação não pode ser desfeita.")
    )
      return;
    setBusy(true);
    try {
      await api("tasks", {
        method: "DELETE",
        body: JSON.stringify({ id: edit.id }),
      });
      await load();
      setModal(false);
      setNotice("Tarefa excluída");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function csv() {
    const rows = [
      ["Título", "Projeto", "Prioridade", "Status", "Prazo"],
      ...tasks.map((t) => [
        t.title,
        t.project,
        t.priority,
        t.status,
        t.due_date?.slice(0, 10) || "",
      ]),
    ];
    const value =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/"/g, '""')
                  .replace(/^[=+@-]/, "'$&") +
                '"',
            )
            .join(";"),
        )
        .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([value], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "flowdesk-tarefas.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const filtered = tasks.filter(
    (t) =>
      (project === "Todos" || t.project === project) &&
      (t.title + " " + t.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.due_date &&
      t.due_date.slice(0, 10) < new Date().toLocaleDateString("en-CA"),
  ).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  if (!ready)
    return (
      <div className="loading">
        <Layers /> Preparando seu espaço…
      </div>
    );
  if (!user)
    return (
      <main className="auth">
        <section className="auth-story">
          <a className="brand">
            <span>
              <Layers size={22} />
            </span>
            flowdesk<span className="tiny">®</span>
          </a>
          <div className="story-content">
            <div className="eyebrow">MENOS RUÍDO. MAIS PROGRESSO.</div>
            <h1>
              Grandes ideias.
              <br />
              Pequenos passos.
              <br />
              <em>Entregas reais.</em>
            </h1>
            <p>Seu próximo projeto merece um espaço onde tudo faz sentido.</p>
            <div className="mini-board">
              <div>
                <i /> Planejar <span>03</span>
              </div>
              <div className="mini-card">
                <CheckCircle2 size={18} /> Uma ideia que saiu do papel{" "}
                <span>↗</span>
              </div>
              <div className="mini-card muted">
                <Clock size={18} /> Seu próximo grande projeto
              </div>
              <div className="mini-progress">
                <span />
              </div>
              <small>Cada entrega conta.</small>
            </div>
          </div>
          <footer>DESENVOLVIDO POR ERIC IKEDA · PROJETO DE PORTFÓLIO</footer>
        </section>
        <section className="auth-form">
          <div className="login-box">
            <span className="pill">SEU ESPAÇO DE TRABALHO</span>
            <h2>
              {mode === "login"
                ? "Bom ter você por aqui."
                : "Vamos construir algo?"}
            </h2>
            <p>
              {mode === "login"
                ? "Entre para organizar o que vem a seguir."
                : "Crie sua conta e comece com um quadro de exemplo."}
            </p>
            <form onSubmit={login}>
              {mode === "register" && (
                <label>
                  Seu nome
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                  />
                </label>
              )}
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                />
              </label>
              <label>
                Senha
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Pelo menos 8 caracteres"
                />
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="primary wide" disabled={busy}>
                {busy
                  ? "Preparando…"
                  : mode === "login"
                    ? "Entrar no FlowDesk"
                    : "Criar minha conta"}
                <ArrowRight size={17} />
              </button>
            </form>
            <div className="divider">ou explore sem cadastro</div>
            <button
              className="secondary wide"
              disabled={busy}
              onClick={() => authenticate({ mode: "demo" })}
            >
              Experimentar demonstração <ArrowUpRight size={17} />
            </button>
            <small className="demo-info">
              Um espaço exclusivo para você testar. Os dados ficam salvos
              durante sua sessão de 7 dias.
            </small>
            <p className="switch">
              {mode === "login" ? "Primeira vez aqui?" : "Já tem uma conta?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
            <div className="privacy">
              Seus projetos são privados. Use dados fictícios na demonstração.
            </div>
          </div>
        </section>
      </main>
    );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar expanded" : "sidebar"}>
        <a className="brand" href="/" aria-label="FlowDesk início">
          <span>
            <Layers size={21} />
          </span>
          flowdesk
        </a>
        <div className="workspace">
          <span className="workspace-icon">E</span>
          <div>
            Meu workspace<small>Espaço pessoal</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {[
            [LayoutDashboard, "Visão geral"],
            [Columns3, "Meu quadro"],
            [FolderKanban, "Projetos"],
            [Activity, "Atividades"],
          ].map(([Icon, name]) => {
            const I = Icon as typeof Layers;
            return (
              <button
                key={String(name)}
                className={view === name ? "active" : ""}
                onClick={() => {
                  setView(String(name));
                  setMobile(false);
                  setError("");
                }}
              >
                <I size={18} />
                {String(name)}
                {name === "Meu quadro" && (
                  <span className="nav-count">{tasks.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <div>
              Um passo de cada vez.<span>✦</span>
            </div>
            <p>Transforme o próximo “depois” em uma entrega.</p>
            <button onClick={() => open()}>
              Criar uma tarefa <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="settings" onClick={() => setView("Configurações")}>
            <Settings size={18} /> Configurações
          </button>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              {user.name}
              <small>Conta pessoal</small>
            </div>
            <button
              aria-label="Sair"
              onClick={async () => {
                try {
                  await api("auth", { method: "DELETE" });
                  setUser(null);
                  setTasks([]);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon"
            aria-label="Abrir menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={13} /> <b>{view}</b>
          </span>
          <div>
            <span className="status-dot" /> Tudo em um só lugar{" "}
            <span className="avatar small">{user.name.slice(0, 1)}</span>
          </div>
        </header>
        <main className="content">
          <div className="heading">
            <div>
              <div className="eyebrow">SEU TRABALHO, COM CLAREZA</div>
              <h1>
                {view === "Visão geral"
                  ? `Olá, ${user.name.split(" ")[0]}. Vamos fazer acontecer?`
                  : view}
              </h1>
              <p>
                {view === "Visão geral"
                  ? "Um olhar sobre seus projetos e o que realmente importa hoje."
                  : view === "Meu quadro"
                    ? "Da primeira ideia à última entrega. Encontre seu fluxo."
                    : view === "Projetos"
                      ? "Três frentes de trabalho. Uma visão conectada."
                      : view === "Atividades"
                        ? "A história das suas entregas, uma mudança por vez."
                        : "Seu espaço, suas preferências."}
              </p>
            </div>
            <button className="primary" onClick={() => open()}>
              <Plus size={17} /> Nova tarefa
            </button>
          </div>
          {error && (
            <div role="alert" className="error banner">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
          {view === "Visão geral" && (
            <>
              <div className="stats">
                {[
                  {
                    label: "Total de tarefas",
                    value: tasks.length,
                    icon: Layers,
                    caption: "Ideias em movimento",
                    color: "purple",
                  },
                  {
                    label: "Em andamento",
                    value: tasks.filter((t) => t.status === "progress").length,
                    icon: Clock,
                    caption: "O foco está aqui",
                    color: "blue",
                  },
                  {
                    label: "Concluídas",
                    value: done,
                    icon: Check,
                    caption: `${progress}% do seu planejamento`,
                    color: "green",
                  },
                  {
                    label: "Prazos vencidos",
                    value: overdue,
                    icon: AlertCircle,
                    caption: overdue
                      ? "Hora de reorganizar"
                      : "Tudo dentro do prazo",
                    color: "orange",
                  },
                ].map((s) => (
                  <div className="stat" key={s.label}>
                    <div>
                      {s.label}
                      <span className={"stat-icon " + s.color}>
                        <s.icon size={17} />
                      </span>
                    </div>
                    <strong>{String(s.value).padStart(2, "0")}</strong>
                    <small>{s.caption}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="focus">
                  <div className="eyebrow">DA IDEIA À ENTREGA</div>
                  <h2>
                    Seu próximo passo
                    <br />
                    começa por aqui.
                  </h2>
                  <p>
                    Escolha uma prioridade, encontre seu ritmo
                    <br />e dê espaço para o progresso.
                  </p>
                  <button onClick={() => setView("Meu quadro")}>
                    Explorar meu quadro <ArrowRight size={16} />
                  </button>
                  <div className="orbit">
                    <div className="orbit-inner">
                      <Layers size={40} />
                    </div>
                    <span className="orbit-chip chip1">
                      <CheckCircle2 size={15} /> Um passo à frente
                    </span>
                    <span className="orbit-chip chip2">
                      ✦ Foco no que importa
                    </span>
                  </div>
                </section>
                <section className="progress-panel">
                  <div className="panel-title">
                    <h3>Ritmo de entregas</h3>
                    <span>Visão atual</span>
                  </div>
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#7770ed ${progress}%,#efedf9 0)`,
                    }}
                  >
                    <div>
                      <strong>{progress}%</strong>
                      <small>concluído</small>
                    </div>
                  </div>
                  <p>
                    <strong>
                      {done} de {tasks.length} tarefas
                    </strong>{" "}
                    concluídas
                  </p>
                  <div className="legend">
                    <span>
                      <i />
                      Concluídas
                    </span>
                    <span>
                      <i />
                      Em aberto
                    </span>
                  </div>
                </section>
              </div>
            </>
          )}
          {(view === "Visão geral" || view === "Meu quadro") && (
            <section className="board-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {view === "Visão geral"
                      ? "Seu quadro de trabalho"
                      : "Todas as tarefas"}{" "}
                    <span>{filtered.length}</span>
                  </h2>
                  <p>Pequenos movimentos, grandes resultados.</p>
                </div>
                <button className="text-button" onClick={csv}>
                  <Download size={15} /> Exportar CSV
                </button>
              </div>
              <div className="board-tools">
                <div className="tabs">
                  {["Todos", "Website", "Mobile", "Plataforma"].map((p) => (
                    <button
                      className={project === p ? "selected" : ""}
                      key={p}
                      onClick={() => setProject(p)}
                    >
                      {p === "Todos" ? "Todos os projetos" : p}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    placeholder="Buscar tarefa…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Buscar tarefa"
                  />
                </label>
              </div>
              <div className="board">
                {columns.map((c) => (
                  <section
                    className="column"
                    key={c.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const t = tasks.find(
                        (t) => t.id === e.dataTransfer.getData("text/plain"),
                      );
                      if (t) move(t, c.id);
                    }}
                  >
                    <div className="column-title">
                      <span>
                        <i style={{ background: c.color }} />
                        {c.name}
                        <b>
                          {filtered.filter((t) => t.status === c.id).length}
                        </b>
                      </span>
                      <button
                        aria-label={"Adicionar tarefa em " + c.name}
                        onClick={() => {
                          open();
                          setForm({ ...blank, status: c.id });
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="cards">
                      {filtered
                        .filter((t) => t.status === c.id)
                        .map((t) => (
                          <article
                            key={t.id}
                            className="task"
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData("text/plain", t.id)
                            }
                          >
                            <div className="task-top">
                              <span
                                className={
                                  "project-tag " + t.project.toLowerCase()
                                }
                              >
                                {t.project}
                              </span>
                              <button
                                aria-label={"Editar " + t.title}
                                onClick={() => open(t)}
                              >
                                <Ellipsis size={18} />
                              </button>
                            </div>
                            <button
                              className="task-title"
                              onClick={() => open(t)}
                            >
                              {t.title}
                            </button>
                            <p>
                              {t.description ||
                                "Sem descrição. Adicione os próximos passos."}
                            </p>
                            <div className="task-footer">
                              <span className={"priority " + t.priority}>
                                ▥ {t.priority}
                              </span>
                              {t.due_date && (
                                <span>
                                  <Clock size={12} />
                                  {new Date(
                                    t.due_date.slice(0, 10) + "T12:00:00",
                                  ).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                              )}
                            </div>
                            <label className="task-status">
                              <span className="sr-only">
                                Status de {t.title}
                              </span>
                              <select
                                value={t.status}
                                onChange={(e) => move(t, e.target.value)}
                              >
                                {columns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <span className="avatar tiny-avatar">
                                {user.name.slice(0, 1)}
                              </span>
                            </label>
                          </article>
                        ))}
                      <button
                        className="add-card"
                        onClick={() => {
                          open();
                          setForm({ ...blank, status: c.id });
                        }}
                      >
                        <Plus size={14} /> Adicionar tarefa
                      </button>
                    </div>
                  </section>
                ))}
              </div>
              {!tasks.length && (
                <p className="empty">
                  Seu quadro está pronto para a primeira ideia. Crie uma tarefa
                  para começar.
                </p>
              )}
            </section>
          )}
          {view === "Projetos" && (
            <div className="project-grid">
              {["Website", "Mobile", "Plataforma"].map((p, i) => {
                const ts = tasks.filter((t) => t.project === p),
                  n = ts.filter((t) => t.status === "done").length;
                return (
                  <section className="project-card" key={p}>
                    <span className={"project-symbol symbol" + i}>
                      <FolderKanban />
                    </span>
                    <h2>{p}</h2>
                    <p>
                      {
                        [
                          "Experiências web que fazem a diferença.",
                          "Boas ideias na palma da mão.",
                          "A base para conectar tudo.",
                        ][i]
                      }
                    </p>
                    <div className="project-meta">
                      {ts.length} tarefas{" "}
                      <span>
                        {ts.length ? Math.round((n / ts.length) * 100) : 0}%
                        concluído
                      </span>
                    </div>
                    <progress value={n} max={ts.length || 1} />
                    <button
                      className="secondary wide"
                      onClick={() => {
                        setProject(p);
                        setView("Meu quadro");
                      }}
                    >
                      Abrir projeto <ArrowRight size={16} />
                    </button>
                  </section>
                );
              })}
            </div>
          )}
          {view === "Atividades" && (
            <section className="activity-list">
              {activities.length ? (
                activities.map((a) => (
                  <div key={a.id}>
                    <span className="activity-icon">
                      <CheckCircle2 size={19} />
                    </span>
                    <div>
                      <strong>{a.message}</strong>
                      <small>
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  As alterações nas suas tarefas aparecerão aqui.
                </div>
              )}
            </section>
          )}
          {view === "Configurações" && (
            <section className="settings-panel">
              <h2>Sua conta</h2>
              <label>
                Nome
                <input readOnly value={user.name} />
              </label>
              <label>
                E-mail
                <input
                  readOnly
                  value={
                    user.email.endsWith("@demo.flowdesk.local")
                      ? "Conta de demonstração"
                      : user.email
                  }
                />
              </label>
              <hr />
              <h3>Seus dados</h3>
              <p>
                As tarefas são privadas e vinculadas à sua conta. Exporte uma
                cópia do planejamento quando quiser.
              </p>
              <button className="secondary" onClick={csv}>
                <Download size={16} /> Exportar tarefas
              </button>
              <hr />
              <h3>Sobre o FlowDesk</h3>
              <p>
                Aplicação de portfólio desenvolvida por Eric Ikeda com Next.js,
                TypeScript e PostgreSQL no Neon.
              </p>
              <a
                href="https://www.ericyikeda.com.br/"
                target="_blank"
                rel="noreferrer"
              >
                Conhecer o desenvolvedor ↗
              </a>
            </section>
          )}
          <footer className="app-footer">
            <span>Construído para dar espaço às boas ideias.</span>
            <span>FlowDesk · por Eric Ikeda</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">DO PLANO À AÇÃO</span>
                <h2 id="modal-title">
                  {edit ? "Detalhes da tarefa" : "Uma nova possibilidade."}
                </h2>
              </div>
              <button
                className="icon"
                aria-label="Fechar"
                onClick={() => setModal(false)}
              >
                <X size={21} />
              </button>
            </div>
            <form onSubmit={save}>
              <label>
                Título
                <input
                  autoFocus
                  required
                  minLength={3}
                  maxLength={140}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="O que vamos construir?"
                />
              </label>
              <label>
                Descrição
                <textarea
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Contexto, ideias e próximos passos…"
                />
              </label>
              <div className="form-grid">
                <label>
                  Projeto
                  <select
                    value={form.project}
                    onChange={(e) =>
                      setForm({ ...form, project: e.target.value })
                    }
                  >
                    {["Website", "Mobile", "Plataforma"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Prioridade
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  >
                    {["baixa", "média", "alta"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prazo
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm({ ...form, due_date: e.target.value })
                    }
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                {edit && (
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={remove}
                  >
                    Excluir tarefa
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancelar
                </button>
                <button className="primary" disabled={busy}>
                  {busy ? "Salvando…" : "Salvar tarefa"}
                  <Check size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
