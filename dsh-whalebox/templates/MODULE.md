# 新模块模板

## 1. 在 index.js 的 MODULES 里登记

```js
{ id: "demo", kind: "native", label: "示例", tools: ["whalebox_demo"] }
```

kind 三选一：

- `native`：实现在本包内。
- `wrapped`：包第三方插件，只登记工具 + 进设置页 + onDisable 真停。
- `bundle`：注入页面或改宿主 UI 的，留在 bundle 层，这里只登记不实现。

## 2. 写工具

```js
const seen = new Set();
function registerTool(ctx, def) {
  if (seen.has(def.name)) throw new Error(`whalebox: 工具名冲突 ${def.name}`);
  seen.add(def.name);
  ctx.tools.register(def);
}

function demo(requireModule) {
  return {
    name: "whalebox_demo",
    description: "...",
    parameters: {},
    output: { schema: {}, render: (v) => v },
    isConcurrencySafe: true,
    async execute() {
      requireModule("demo");
      return { ok: true };
    },
  };
}
```

## 3. 守三条

- 先 `requireModule(id)` 再干活；模块关掉时抛 `whalebox: 模块 X 已关闭`，别假装成功。
- 本地服务调用带超时（2.5s），失败回 `{ error }` 不抛。
- 一切会写盘的操作先备份到 `~/.dsh/backups/`，并返回 `restartRequired`。

## 4. 测

`node --check index.js`；临时 node_modules 里桩 `schemastery / dsh-tools / dsh-home-paths`，跑一遍注册 + 关模块报错 + 服务没起时 offline。

## 5. 代码骨架

同目录 `module.js` 可直接复制成 `modules/<id>.js`：含 `callJson`（2.5s 超时）、`requireModule` 守门、`state.write` 落盘两个示例工具。
