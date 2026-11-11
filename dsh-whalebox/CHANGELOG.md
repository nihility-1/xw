# Changelog

## 0.3.1

- 新增声明式扩展：`%DSH_HOME%/whalebox/modules.json` 可以挂自己的 wrapped 模块，不改代码。
- 校验规则：id 必须 `^[a-z][a-z0-9-]{1,31}$`、不能和内置模块重名、只接受 `kind: wrapped`；写坏的条目直接忽略，不影响启动。
- 设置面板改成读 `/dsh-whalebox/config` 的 `moduleList`，外部挂进来的模块会自己出现。

## 0.3.0

- 切开源版：只保留通用 core + 5 个 `wrapped` 模块（看图/画图/运维/人格卡/插件市场）。
- 移除与本机服务绑定的原生模块及其工具，仓库不含任何个人数据或私有服务。
- 工具收敛为 4 个：`whalebox_status` / `_module` / `_ports` / `_plugins`。
- `requireModule(home, id)` 改为显式传 home；状态文件与 patch 写入保持原子/原地写。

## 0.2.3

- 面板拆成「核心包 / 第三方代挂」两组，代挂项显示 `adopted` 与来源模块。
- `listProfilePlugins()` 改读 `cordis.patch.yml`，不再按 bundles 判断开关。
- 新增模块 `soul`（人格卡，wrapped）、`catalog`（插件市场，wrapped），共 9 个模块。
- `POST /dsh-whalebox/config` 的 plugins 分支改走 `setPlugins`，返回 `restartRequired`。
- 修：写 patch 用原地写入，避免 pnpm 硬链接被 rename 写断。

## 0.2.2

- 修：`cordis.patch.yml` 补上「自己插自己」的 self entry —— bundle 不会自动挂载。
- `webServer` 解析加兜底：`ctx.get("webServer")` 失败再取 `ctx.webServer`。
- 路由注册改为 `{ kind: "exact", path }`，并声明 `webServer` / `connection` 注入。

## 0.2.1

- 模块开关做成真 gating：`requireModule(id)`，关掉即报错。
- 新增 `whalebox_plugins`；README / ROLLBACK / 模块模板。

## 0.2.0

- 自带设置通道：`GET/POST /dsh-whalebox/config`，状态写入 `state.json`。
- 放弃宿主的 configForms 写入路径（`settle` 不等于 `applied`）。

## 0.1.0

- 首个版本：core 骨架、7 个模块位、3 个工具（status / module / ports）。
