# 让别人挂自己的插件（不写代码）

鲸箱的模块清单分两层：内置的写在 `index.js` 的 `MODULES` 里；
外部插件可以把清单放进 **`%DSH_HOME%/whalebox/modules.json`**，不用改代码、不用重新打包。

## 文件格式

路径：`%DSH_HOME%/whalebox/modules.json`（`%DSH_HOME%` 就是 DSH 的主目录，默认是用户目录下的 `.dsh`）。

```json
{
  "modules": [
    { "id": "notify", "name": "通知", "kind": "wrapped", "upstream": "my-notify-plugin" }
  ]
}
```

也可以直接写成数组 `[{ ... }]`。示例见 `examples/modules.example.json`。

## 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 模块 id，`^[a-z][a-z0-9-]{1,31}$`，不能和内置重名（vision / draw / ops / soul / catalog） |
| `name` | 否 | 面板显示名，缺省用 id |
| `kind` | 是 | 只接受 `wrapped`：登记第三方插件、进统一开关，不执行任何代码 |
| `upstream` | 否 | 第三方包名，仅作展示与排错 |
| `tools` | 否 | 工具名清单，仅作展示 |

## 生效方式

文件在插件 `apply` 时读一次，**改完重启 DSH 生效**。条目写坏（id 非法、类型不对、重名）只会被忽略，
其余模块照常启动；鲸箱不会因为这份文件起不来。

## 为什么只做 wrapped

`native` 模块要往内核里注册代码。声明式加载如果允许带代码，就等于「谁往 json 里写一段脚本，
谁就能在 DSH 主进程里跑」——这是要避免的。要加自己的工具，走 `templates/module.js` 写一个 native 模块。
