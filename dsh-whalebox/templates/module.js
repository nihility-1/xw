// 鲸箱模块模板 —— 复制成 modules/<id>.js，按需改名后再登记进 index.js 的 MODULES。
//
// 约定：
// 1) 每个模块导出 create<Name>({ requireModule, home }) —— 返回 { id, tools }。
// 2) 工具 execute 的第一行先 requireModule(id)；关掉的模块必须抛错，不许假装成功。
// 3) 本地服务调用 2.5s 超时，失败返回 { error }，不抛。
// 4) 写盘先备份、再原地写；返回 restartRequired 由上层汇总。

const TIMEOUT_MS = 2500;

async function callJson(url, init = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) return { error: `HTTP ${res.status}`, body };
    return { ok: true, status: res.status, body };
  } catch (err) {
    return { error: err?.name === "AbortError" ? "timeout" : String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

export function createDemoModule({ requireModule, home, state }) {
  const id = "demo";

  return {
    id,
    tools: [
      {
        name: "whalebox_demo_ping",
        description: "示例：读一个本机服务的健康状态。模块关闭时直接报错。",
        parameters: {},
        output: { schema: {}, render: (v) => v },
        isConcurrencySafe: true,
        async execute() {
          requireModule(home, id);
          const r = await callJson("http://127.0.0.1:8080/health");
          return r.ok ? { ok: true, body: r.body } : { ok: false, error: r.error };
        },
      },
      {
        name: "whalebox_demo_toggle",
        description: "示例：落盘一个模块级开关（数组式 entries 写法，便于和 state.json 合并）。",
        parameters: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
          },
        },
        output: { schema: {}, render: (v) => v },
        isConcurrencySafe: false,
        async execute(args) {
          requireModule(home, id);
          const next = !!args?.enabled;
          state.write({ modules: { [id]: next } });
          return { ok: true, enabled: next };
        },
      },
    ],
  };
}
