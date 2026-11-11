/**
 * dsh-whalebox — 一个包，core 注册器 + 模块清单。
 *
 * core：模块登记、开关、状态文件、设置面板、代挂（adopted）管理。
 * 只做通用能力：不绑定任何具体插件、不读写第三方数据。
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";

export const name = "whalebox";
export const inject = ["tools", "webServer", "connection"];
export const NS = "whalebox";
export const VERSION = "0.3.1";

/** 模块清单：kind = wrapped（代挂第三方，登记它的工具）| bundle（宿主层） */
export const MODULES = [
  { id: "vision",  name: "看图",     kind: "wrapped", upstream: "dsh-see-now" },
  { id: "draw",    name: "画图",     kind: "wrapped", upstream: "dsh-drawai" },
  { id: "ops",     name: "运维",     kind: "wrapped", upstream: "dsh-ops" },
  { id: "soul",    name: "人格卡",   kind: "wrapped", upstream: "dsh-soul-md" },
  { id: "catalog", name: "插件市场", kind: "wrapped", upstream: "dsh-plugins-catalog" },
];

/* ── 声明式扩展：%DSH_HOME%/whalebox/modules.json ─────────
 * 让别人不碰代码就能挂自己的插件：
 *   [{ "id": "notify", "name": "通知", "kind": "wrapped", "upstream": "my-notify-plugin" }]
 * 只接受 wrapped：登记第三方包、进统一开关，不执行任何代码。
 * 写坏了只忽略这一条并告警，不影响核心启动。
 */

const ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

function extraModulesPath(home) {
  return join(stateHome(home), "modules.json");
}

export function readExtraModules(home) {
  const out = [];
  let raw;
  try {
    raw = JSON.parse(readFileSync(extraModulesPath(home), "utf8"));
  } catch {
    return out;
  }
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.modules) ? raw.modules : [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!ID_RE.test(id)) continue;
    if (item.kind !== "wrapped") continue;
    if (MODULES.some((m) => m.id === id)) continue;
    if (out.some((m) => m.id === id)) continue;
    out.push({
      id,
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : id,
      kind: "wrapped",
      upstream: typeof item.upstream === "string" ? item.upstream : null,
      tools: Array.isArray(item.tools) ? item.tools.filter((x) => typeof x === "string") : [],
      source: "file",
    });
  }
  return out;
}

export function effectiveModules(home) {
  return [...MODULES, ...readExtraModules(home)];
}

/** 需要随 DSH 启动的核心包：面板里只展示，不可关。 */
const CORE_PACKAGES = ["dsh-whalebox"];

export const Config = z.object({
  enabled: z.boolean().default(true).description("总开关"),
  modules: z.dict(z.boolean()).default({}).description("模块开关"),
  ports: z.dict(z.number()).default({}).description("本机端口约定，供面板展示"),
});

const startedAt = Date.now();
const seen = new Set();

/** 拼 profile 目录。DSH_PROFILE 可选，默认 desktop。 */
function profileName() {
  return process.env.DSH_PROFILE || "desktop";
}

function profileRoot(home) {
  return join(home, "profiles", profileName());
}

function stateHome(home) {
  return join(home, "whalebox");
}

function statePath(home) {
  return join(stateHome(home), "state.json");
}

function readState(home) {
  try {
    const raw = JSON.parse(readFileSync(statePath(home), "utf8"));
    return {
      version: 1,
      enabled: raw.enabled !== false,
      modules: raw.modules && typeof raw.modules === "object" ? raw.modules : {},
      ports: raw.ports && typeof raw.ports === "object" ? raw.ports : {},
    };
  } catch {
    return { version: 1, enabled: true, modules: {}, ports: {} };
  }
}

function writeState(home, next) {
  const dir = stateHome(home);
  mkdirSync(dir, { recursive: true });
  const p = statePath(home);
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
  renameSync(tmp, p);
  return next;
}

function moduleOn(state, id) {
  if (!state.enabled) return false;
  return state.modules[id] !== false;
}

/** 工具入口的第一道门：模块没开就报错，而不是静默返回空。 */
export function requireModule(home, id) {
  const st = readState(home);
  if (!moduleOn(st, id)) throw new Error(`whalebox: 模块 ${id} 已关闭`);
}

/* ── 代挂：cordis.patch.yml ─────────────────────────────── */

function selfDir() {
  try { return import.meta.dirname || ""; } catch { return ""; }
}

function patchFile() {
  return join(selfDir(), "cordis.patch.yml");
}

/** 读 patch 里所有 `- id: xxx`，返回 id 集合（含 self）。 */
export function readAdoptedActive(file = patchFile()) {
  const ids = new Set();
  try {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/^\s*-\s*id:\s*['"]?([^\s'"]+)/gm)) ids.add(m[1]);
  } catch { /* 没有 patch 就是空 */ }
  return ids;
}

/** 把 patch 重写成 self + active。原地写，避免 pnpm 硬链接被 rename 写断。 */
export function writeAdoptedPatch(active, file = patchFile()) {
  const ids = new Set(["dsh-whalebox", ...active]);
  const lines = ["# dsh-whalebox — bundle patch layer", "# 由设置面板维护；改完需重启 DSH 生效。", "- insert:"];
  for (const id of ids) lines.push(`    - id: ${id}`, `      name: '${id}'`);
  const text = lines.join("\n") + "\n";
  try {
    writeFileSync(file, text, "utf8");
  } catch {
    const tmp = file + ".tmp";
    writeFileSync(tmp, text, "utf8");
    renameSync(tmp, file);
  }
  return [...ids];
}

/** 一个包是不是本机代挂项：在 patch 里、且不是自己、且不是核心。 */
function isAdopted(id) {
  return id !== "dsh-whalebox" && !CORE_PACKAGES.includes(id);
}

/* ── profile 里的第三方插件 ─────────────────────────────── */

function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

export function listProfilePlugins(home) {
  const root = profileRoot(home);
  const pkg = readJson(join(root, "package.json")) || {};
  const bundles = Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles : [];
  const active = readAdoptedActive();
  const out = [];
  for (const name of bundles) {
    const meta = readJson(join(root, "node_modules", name, "package.json")) || {};
    const adopted = isAdopted(name);
    out.push({
      name,
      version: meta.version || "?",
      enabled: adopted ? active.has(name) : true,
      adopted,
      protected: CORE_PACKAGES.includes(name),
    });
  }
  return out.sort((a, b) => Number(a.protected) - Number(b.protected) || a.name.localeCompare(b.name));
}

function setPlugins(home, changes) {
  const active = readAdoptedActive();
  const changed = [];
  for (const [id, on] of Object.entries(changes || {})) {
    if (!isAdopted(id)) continue;
    if (on && !active.has(id)) { active.add(id); changed.push(id); }
    if (!on && active.has(id)) { active.delete(id); changed.push(id); }
  }
  if (changed.length) writeAdoptedPatch(active);
  return { changed: changed.length, restartRequired: changed.length > 0, active: [...active], bundles: [] };
}

/* ── HTTP ──────────────────────────────────────────────── */

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": buf.length });
  res.end(buf);
}

function requestRejected(ctx, req) {
  try {
    const conn = typeof ctx.get === "function" ? ctx.get("connection") : null;
    return typeof conn?.requestRejection === "function" ? conn.requestRejection(req) : null;
  } catch {
    return null;
  }
}

function resolveWebServer(ctx) {
  let server = null;
  try { server = typeof ctx.get === "function" ? ctx.get("webServer") : null; } catch { server = null; }
  if (!server) server = ctx.webServer;
  return server;
}

const isPortOpen = (port) => new Promise((resolve) => {
  const s = net.connect({ host: "127.0.0.1", port });
  const done = (v) => { try { s.destroy(); } catch {} resolve(v); };
  s.setTimeout(600, () => done(false));
  s.once("connect", () => done(true));
  s.once("error", () => done(false));
});

/* ── 工具 ──────────────────────────────────────────────── */

function text(t) { return [{ type: "text", text: t }]; }

export function apply(ctx, config) {
  const home = process.env.DSH_HOME || resolveDshHome();
  const st = () => readState(home);
  const list = () => effectiveModules(home);
  const state = readState(home);

  ctx.tools.register(defineTool({
    name: "whalebox_status",
    description: "鲸箱总览：版本、运行时长、模块开关、状态文件位置。只读。",
    parameters: {},
    output: {
      schema: { type: "object", additionalProperties: true, properties: {} },
      render: (_a, v) => text(`${v.version} · ${v.modules.length} modules · ${v.enabled ? "on" : "off"} · ${v.stateFile}`),
    },
    isConcurrencySafe: () => true,
    async execute() {
      const s = st();
      return {
        version: VERSION,
        enabled: s.enabled,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        modules: list().map((m) => ({ id: m.id, name: m.name, kind: m.kind, upstream: m.upstream, source: m.source || "builtin", enabled: moduleOn(s, m.id) })),
        stateFile: statePath(home),
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: "whalebox_module",
    description: "开/关一个鲸箱模块；关掉后对应工具会直接报错。写 state.json，立即生效。",
    parameters: {
      id: { type: "string", description: `模块 id：${MODULES.map((m) => m.id).join(" / ")}` },
      enabled: { type: "boolean", description: "true 开 / false 关" },
    },
    output: {
      schema: { type: "object", additionalProperties: true, properties: {} },
      render: (_a, v) => text(v.modules.map((m) => `${m.id}:${m.enabled ? "on" : "off"}`).join(" · ")),
    },
    isConcurrencySafe: () => true,
    async execute(args) {
      const mod = list().find((m) => m.id === args.id);
      if (!mod) throw new Error(`whalebox: 未知模块 ${args.id}（可用：${list().map((m) => m.id).join(", ")}）`);
      const s = st();
      s.modules[mod.id] = !!args.enabled;
      writeState(home, s);
      return { modules: list().map((m) => ({ id: m.id, enabled: moduleOn(s, m.id) })) };
    },
  }));

  ctx.tools.register(defineTool({
    name: "whalebox_ports",
    description: "探测本机端口是否在监听（默认取 state.ports；没配就空）。只读。",
    parameters: { ports: { type: "array", items: { type: "number" }, description: "可选：要探测的端口列表" } },
    output: { schema: { type: "object", additionalProperties: true, properties: {} }, render: (_a, v) => text(v.ports.map((p) => `${p.port}:${p.open ? "open" : "closed"}`).join(" · ") || "no ports") },
    isConcurrencySafe: () => true,
    async execute(args) {
      const s = st();
      const list = Array.isArray(args?.ports) && args.ports.length ? args.ports : Object.values(s.ports || {});
      const ports = [];
      for (const port of list) ports.push({ port, open: await isPortOpen(port) });
      return { ports };
    },
  }));

  ctx.tools.register(defineTool({
    name: "whalebox_plugins",
    description: "列出 profile 里的第三方插件（版本 / 是否随 DSH 启动 / 能否代挂关闭）。只读。",
    parameters: {},
    output: { schema: { type: "object", additionalProperties: true, properties: {} }, render: (_a, v) => text(v.plugins.map((p) => `${p.name}@${p.version}:${p.enabled ? "on" : "off"}`).join(" · ") || "no plugins") },
    isConcurrencySafe: () => true,
    async execute() {
      return { profile: profileName(), plugins: listProfilePlugins(home) };
    },
  }));

  /* ── 设置通道 ─────────────────────────────────────── */
  const server = resolveWebServer(ctx);
  if (server && typeof server.register === "function") {
    try {
      server.register({
        kind: "exact",
        path: "/dsh-whalebox/config",
        handler: async (req, res) => {
          try {
            const rejected = requestRejected(ctx, req);
            if (rejected) { sendJson(res, 401, { ok: false, error: "unauthorized" }); return; }
            if (req.method === "GET") {
              sendJson(res, 200, { ok: true, version: VERSION, modules: list().map((m) => m.id), moduleList: list().map((m) => ({ id: m.id, name: m.name, kind: m.kind, source: m.source || "builtin" })), state: st(), plugins: listProfilePlugins(home) });
              return;
            }
            if (req.method === "POST") {
              const body = JSON.parse(await readBody(req));
              if (body.plugins && typeof body.plugins === "object") {
                const r = setPlugins(home, body.plugins);
                sendJson(res, 200, { ok: true, ...r, state: st(), plugins: listProfilePlugins(home) });
                return;
              }
              const s = st();
              if (typeof body.enabled === "boolean") s.enabled = body.enabled;
              if (body.modules && typeof body.modules === "object") {
                for (const [id, on] of Object.entries(body.modules)) {
                  if (list().some((m) => m.id === id)) s.modules[id] = !!on;
                }
              }
              writeState(home, s);
              sendJson(res, 200, { ok: true, state: s, plugins: listProfilePlugins(home) });
              return;
            }
            sendJson(res, 405, { ok: false, error: "method not allowed" });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
          }
        },
      });
    } catch (e) {
      console.warn(`[whalebox] 路由注册失败：${String((e && e.message) || e)}`);
    }
  } else {
    console.warn("[whalebox] 没有 webServer，设置面板不可用");
  }

  ctx.effect(() => {
    console.log(`[whalebox] core ready · ${list().length} modules · ${statePath(home)}`);
    return () => { seen.clear(); };
  }, "whalebox.core()");
}

export { apply as default };
