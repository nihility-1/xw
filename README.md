# dsh-whalebox · 鲸箱

> 一个包，一个注册器，一组模块。把「装了一堆插件之后工具表越来越肥」这件事，
> 收进一个面板里管。

![license](https://img.shields.io/badge/license-MIT-blue)
![node](https://img.shields.io/badge/node-%3E%3D20.18-339933)
![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.1--rc.2%20%3C0.3.0-4B32C3)

DSH（DeepSeek Harness）的插件生态很热，但每装一个，模型每次请求都要多背一遍它的工具表；
装到十几个，光工具定义就吃掉一大截上下文。鲸箱不做「功能更强」，它做三件小事：

1. **一个面板管模块开关**（设置 → 鲸箱），关掉就真的不注册工具；
2. **一个 core** 负责配置、状态、端口表、健康检查，模块各自独立；
3. **能代挂第三方**：把你已装的插件登记成 `wrapped` 模块，统一开关、统一显示，
   但**不改它的代码**。

这个仓库只包含鲸箱本身：**不含任何个人配置、数据或私有服务**。
所有模块都是 `wrapped`——由上游插件提供能力，鲸箱只负责登记与开关。

---

## 让别人挂自己的插件（不写代码）

把清单放到 `%DSH_HOME%/whalebox/modules.json`，重启后模块会出现在「鲸箱」面板里：

```json
{ "modules": [ { "id": "notify", "name": "通知", "kind": "wrapped", "upstream": "my-notify-plugin" } ] }
```

只接受 `wrapped`（登记第三方插件、统一开关，不执行代码）；写坏的条目忽略，不影响启动。
细节见 [docs/EXTENDING.md](docs/EXTENDING.md) 与 `examples/modules.example.json`。


## 特性

- **5 个模块位**：看图、画图、运维、人格卡、插件市场。
- **4 个工具**：总览、模块开关、端口探测、插件清单。
- **真 gating**：模块关掉后，对应工具直接报 `whalebox: 模块 xxx 已关闭`，不是只改 UI。
- **代挂（adopted）**：通过 `cordis.patch.yml` 把第三方插件插入启动层；面板改开关即改 patch，
  **重启 DSH 生效**。核心包不可关。
- **自带设置通道**：不走宿主的 configForms（写入只落在 UI），而用插件自己的
  `GET/POST /dsh-whalebox/config` 读写 `%DSH_HOME%/whalebox/state.json`。
- **零运行时依赖**：只用 Node 内建模块 + 宿主提供的 SDK；浏览器半边手写 `ModuleLoader`，无需构建。

---

## 安装

要求：DSH 桌面版 ≥ `0.2.1-rc.2`、`< 0.3.0`；Node ≥ 20.18。

```bash
# 从 npm（发布后）
dsh plugin --profile desktop add dsh-whalebox

# 或从本地目录 / tgz
dsh plugin --profile desktop add file:C:/path/to/dsh-whalebox
```

装完**整个关掉 DSH 再重开**（不是刷新）。然后：`设置 → 鲸箱`。

> 第一次装建议先备份 `%DSH_HOME%/profiles/<profile>/package.json`，
> 回滚就是把它 copy 回去、再删掉 bundles 里的 `dsh-whalebox`。

---

## 面板里有什么

- **模块开关**：勾上/取消，取消即生效（工具立即消失/出现，不用重启）。
- **第三方插件（代挂）**：列出 profile 里的包、版本、是否随 DSH 启动；
  打开一个代挂项会把它写进 `cordis.patch.yml`，**重启 DSH 后**才真的少一组工具。
- **端口表**：`state.ports` 里约定的本机端口，可探测开关。
- **状态行**：`读取中 / 已写入 / 写入失败：… / 读取设置失败：…`，不静默吞错。

---

## 架构

```
dsh-whalebox
├─ index.js            # 宿主半边：core + 工具注册 + /dsh-whalebox/config
├─ client.js           # 浏览器半边：设置页「鲸箱」面板（无构建）
├─ cordis.patch.yml    # bundle patch：默认只插自己；代挂项按需追加
├─ templates/
│  ├─ module.js        # 新模块代码骨架
│  └─ MODULE.md        # 新模块文档模板
└─ docs/
   ├─ ARCHITECTURE.md  # 结构与代挂机制
   └─ ROLLBACK.md      # 四级回滚
```

三层：

| 层 | 放什么 | 谁改 |
| --- | --- | --- |
| `core` | 配置、状态、端口、日志、工具注册器 | 鲸箱 |
| `modules` | `wrapped` 代挂第三方（可再扩 `native`） | 各自 |
| `bundles` | 往 index.html 注入的、改宿主 UI 骨架的 | 保持独立 |

**刻意不做的**：不接管 `systemPrompt`（人设走宿主/桥接注入）、不重写记忆、
不替宿主决定插件顺序、不读写任何第三方插件的数据。

---

## 模块

| id | 名字 | 类型 | 上游 |
| --- | --- | --- | --- |
| `vision` | 看屏幕 | wrapped | `dsh-see-now` |
| `draw` | 画图 / 视频 | wrapped | `dsh-drawai` |
| `ops` | 运维 | wrapped | `dsh-ops` |
| `soul` | 人格卡 | wrapped | `dsh-soul-md` |
| `catalog` | 插件市场 | wrapped | `dsh-plugins-catalog` |

代挂项没装时，模块开关照旧在，但上游工具本来就不存在——鲸箱不报错、不假装。

---

## 工具

| 工具 | 说明 |
| --- | --- |
| `whalebox_status` | 版本、运行时长、模块开关、状态文件路径 |
| `whalebox_module` | 开/关一个模块，返回新状态 |
| `whalebox_ports` | 本机端口占用探测 |
| `whalebox_plugins` | profile 里的第三方插件（版本/是否启动/能否代挂） |

---

## 配置

状态文件：`%DSH_HOME%/whalebox/state.json`

```json
{
  "version": 1,
  "enabled": true,
  "modules": { "vision": true, "draw": true, "ops": true, "soul": false, "catalog": true },
  "ports": { "example": 8080 }
}
```

- `%DSH_HOME%`：宿主提供的 DSH 主目录（默认 `~/.dsh`，可用 `DSH_HOME` 覆盖）。
- 面板读写的就是这一份；`/dsh-whalebox/config` 带宿主会话守卫（未登录 401）。
- `cordis.patch.yml` 会被面板重写（代挂增减），**不要手改**。
  注意：pnpm 的 `file:` 依赖是**硬链接**——直接改源目录等于改运行副本；
  鲸箱写 patch 时用原地写入，就是为了不写断硬链接。

---

## 兼容性

- DSH：`>=0.2.1-rc.2`、`<0.3.0`（`dsh.compatibility` 里写死，宿主会校验）。
- Node：`>=20.18`（用 `node --check` 做语法门禁，无构建步骤）。
- 平台：desktop / web profile 均可；`client.platform = web`。

---

## 开发

```bash
npm run check          # node --check index.js && node --check client.js
```

新增模块：复制 `templates/module.js`，读 `templates/MODULE.md`；
模块必须自己声明 `id / name / kind`，工具入口第一行调 `requireModule(home, id)`。

---

## 安全

- 只监听 `127.0.0.1`；`/dsh-whalebox/config` 过宿主 `connection.requestRejection`（401 兜底）。
- 无遥测、无外网请求、不执行外部命令、不读第三方插件的数据。
- 面板只能改鲸箱自己的 state 与 patch；不会改别的插件的代码或配置。

---

## 路线图

- [x] core 骨架 / 设置面板 / 状态文件
- [x] 代挂第三方 + 面板分组显示
- [x] README / ROLLBACK / 模块模板
- [ ] 代挂项的「热摘」实验（不重启）
- [ ] 截图（面板、分组开关）

---

## 许可

MIT。见 [LICENSE](LICENSE)。
