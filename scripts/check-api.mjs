import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3011",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let started = false;
server.stdout.on("data", async (chunk) => {
  if (started || !String(chunk).includes("Ready")) return;
  started = true;
  try {
    const base = "http://127.0.0.1:3011/api/";
    let cookie = "";
    async function request(path, method = "GET", body) {
      const r = await fetch(base + path, {
        signal: AbortSignal.timeout(20000),
        method,
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      return { r, d };
    }
    const a = await request("auth", "POST", { mode: "demo" });
    assert.equal(a.r.status, 200, JSON.stringify(a.d));
    cookie = a.r.headers.get("set-cookie").split(";")[0];
    assert.ok(a.d.user.id);
    const list = await request("tasks");
    assert.equal(list.d.tasks.length, 5);
    const t = {
      title: "Verificação de integração",
      description: "Tarefa fictícia criada pela validação",
      project: "Website",
      priority: "alta",
      status: "backlog",
      due_date: null,
    };
    const created = await request("tasks", "POST", t);
    assert.equal(created.r.status, 200);
    const id = created.d.task.id;
    const updated = await request("tasks", "PATCH", {
      ...t,
      id,
      status: "done",
    });
    assert.equal(updated.d.task.status, "done");
    const history = await request("activity");
    assert.ok(history.d.activities.length >= 2);
    const firstCookie = cookie;
    const b = await request("auth", "POST", { mode: "demo" });
    cookie = b.r.headers.get("set-cookie").split(";")[0];
    const denied = await request("tasks", "PATCH", {
      ...t,
      id,
      status: "progress",
    });
    assert.equal(denied.r.status, 404);
    cookie = firstCookie;
    const invalid = await request("tasks", "POST", { ...t, title: "a" });
    assert.equal(invalid.r.status, 400);
    console.log(
      "PASS: demo, seed, list, create, update, activity, ownership isolation, validation",
    );
  } catch (e) {
    console.error("FAIL:", e.message);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
});
server.stderr.on("data", () => {});
setTimeout(() => {
  console.error("Integration test timeout");
  server.kill();
  process.exit(1);
}, 90000).unref();
