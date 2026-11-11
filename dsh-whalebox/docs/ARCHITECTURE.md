# 架构

## 为什么是「core + modules」而不是一个大插件

把所有功能写进一个文件，短期省事，长期三件事会一起坏：工具表膨胀、
单点崩溃带走全部、以及任何改动都要重启整套。鲸箱的取舍是：

- **core 只做公共的事**：模块登记、开关、状态、端口表、工具注册器、错误格式。
- **模块各自闭环**：本仓库只提供 `wrapped`（登记上游工具、并进设置页）；新增 native 由使用者自己长。
- **bundle 层保持独立**：往 `index.html` 注入的（启动动画）、改宿主 UI 骨架的，
  不塞进鲸箱——它们的生命周期跟宿主绑定，不是模块。

## 启动链路

```
DSH 启动
└─ profile: dsh.profile.bundles[]           ← 按顺序
   ├─ 每个 bundle 贡献自己的 cordis.patch.yml
   │    └─ - insert: [{ id, name }]          ← name 是包名，从 node_modules 解析
   ├─ profile 自己的 patch（dsh.profile.patch）
   └─ home 级 patch / --patch overlays
        ↓
   合并出运行期的插件树 → 加载 dsh-whalebox
        ↓
   core: 读 state.json → 注册模块 → 注册工具 → 挂 /dsh-whalebox/config
```

注意：**bundle 不会自动挂载自己**。`cordis.patch.yml` 里必须有一条自己的
`- id: dsh-whalebox / name: 'dsh-whalebox'`，否则「别的插件起来了、鲸箱没上车」。

## 代挂（adopted）机制

面板里的「第三方插件」不是重写，而是把已装的包插进启动层：

```yaml
- insert:
    - id: dsh-whalebox
      name: 'dsh-whalebox'      # 自己，永远第一
    - id: dsh-soul-md
      name: 'dsh-soul-md'       # 代挂项
```

- 关掉一个代挂项 = 从 patch 里删掉那两行；重启 DSH 后它就不加载，工具自然消失。
- 面板写 patch 用**原地写入**：pnpm 的 `file:` 依赖是硬链接，
  先写临时文件再 `rename` 会把链接写断（源目录与运行副本从此分家）。
- 面板读的是 `node_modules/<包>/cordis.patch.yml`（DSH 实际加载的那份），
  不是源目录。

## 状态与设置通道

- 状态文件：`%DSH_HOME%/whalebox/state.json`（`version / enabled / modules / ports`）。
- 宿主 `configForms` 的写入只保证「收下」，不保证「应用」；所以鲸箱自带
  `GET/POST /dsh-whalebox/config`，读写同一份 state.json，面板直接 fetch。
- 路由走宿主的 `webServer.register({ kind: "exact", path })`，
  handler 里先过 `connection.requestRejection(req)`，未登录一律 401。

## 模块契约

```js
{
  id: "vision",                  // 唯一
  name: "看屏幕",
  kind: "wrapped",               // wrapped：登记上游工具；native 由使用者自己扩
  upstream: "dsh-see-now",
  tools: []                      // native 模块才在这里列自己的工具名
}
```

工具入口第一行必须：

```js
requireModule(home, "vision");   // 未开启时 throw：whalebox: 模块 vision 已关闭
```

这样「关掉模块」是行为层的，不是 UI 层的。

## 失败语义

- 本机服务没起：返回 `{ error: "..." }`，不抛、不假装成功。
- 工具名冲突：注册期直接抛 `whalebox: 工具名冲突`。
- 未知模块 id：报错并列出合法 id。
- 面板写入失败：状态行显示原因（`写入失败：...`），不静默。

## 边界

| 做 | 不做 |
| --- | --- |
| 模块开关、工具注册、端口约定 | 接管 `systemPrompt` / 人设 |
| 代挂第三方、统一面板 | 重写第三方代码 |
| 只读宿主提供的公开接口 | 改宿主的记忆或压缩策略 |
| 失败如实返回 | 假装服务在线 |
