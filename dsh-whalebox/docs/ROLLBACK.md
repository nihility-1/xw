# 鲸箱回滚

按从小到大的顺序试，前一步不行再走下一步。

## 1. 单个模块关掉（不用重启）

设置 → 鲸箱 → 把出问题的模块点掉，或者：

```
whalebox_module(id="ops", enabled=false)
```

关掉后对应工具立刻不再注册。

## 2. 某个代挂插件出问题

面板里关掉对应的那一项，重启 DSH。`cordis.patch.yml` 里只剩鲸箱自己和其余项。

## 3. 鲸箱整个摘掉（DSH 起不来时）

手动把 profile 的 `package.json` 里 `dsh.profile.bundles` 中的 `dsh-whalebox`
删掉，再删 `node_modules/dsh-whalebox`（或重新跑一次 `dsh plugin --profile desktop remove dsh-whalebox`），
整个关掉 DSH 再开。

## 4. 全量还原

如果你在安装前备份了 `%DSH_HOME%/profiles/<profile>/package.json`：

```
copy /Y "<备份>.json" "%DSH_HOME%\profiles\<profile>\package.json"
```

再删掉 `%DSH_HOME%\whalebox\state.json`，重开 DSH。

## 已知坑

- 改 `cordis.patch.yml` 必须原地写；用 rename 会写断 pnpm 硬链接，源码和运行副本从此不再同一份。
- patch 里第一项必须是鲸箱自己，少了它 DSH 不会加载鲸箱。
- 面板与工具读同一份 `state.json`；直接手改文件不会自动刷新到面板，重开 DSH 才同步。
