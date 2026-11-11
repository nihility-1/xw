# Contributing

欢迎 PR / issue。这个包的定位很小，所以先对一下边界：

1. **不做「大而全」**：新能力优先做成模块，不进 core。
2. **不替宿主做决定**：不改 `systemPrompt`、不重写记忆、不接管别的插件的加载顺序。
3. **失败要如实**：HTTP 失败返回 `{ error }`，不假装成功；错误信息里带模块 id。
4. **零运行时依赖**：只用 Node 内建 + 宿主 SDK；浏览器半边不加构建。

提交前：

```bash
npm run check
```

新增模块请同时给：模块登记项、`requireModule` 守门、README 的模块表一行、
`templates/MODULE.md` 的用法示例。
