# 发布清单（给你自己看）

这个文件夹已经是一个「可开源」的仓库了。发布前只需要改四处：

1. `package.json` 的 `homepage` / `bugs` / `repository` 里把 `nihility-1` 换成你的 GitHub 用户名；
2. `LICENSE` 的版权人（现在是 `nihility-1`，可以换成你的名字/ID）；
3. `README.md` 顶部徽章如果换成真实 CI 徽章；
4. 确认没有本机路径/密钥残留在仓库里（文件里不应出现本机绝对路径）。

## 推到 GitHub

```bash
cd dsh-whalebox
git init
git add .
git commit -m "feat: dsh-whalebox 0.2.3 — 模块注册器与统一开关面板"
git branch -M main
git remote add origin https://github.com/nihility-1/dsh-whalebox.git
git push -u origin main
git tag v0.3.0
git push --tags
```

然后在 GitHub 上建一个 Release，标题 `v0.3.0`，正文可以从 `CHANGELOG.md` 里抄。

## 发 npm（可选）

```bash
npm publish --dry-run   # 先看打包内容
npm publish
```

注意：npm 上 `dsh-whalebox` 这个名字可能已被占；被占就改成 `@<scope>/dsh-whalebox`，
同时把 `package.json` 的 `name` 一起改。

## 装完自检

- `设置 → 鲸箱` 能打开；
- `whalebox_status` 返回 `0.3.0 · 5 modules · on`；
- 关掉「看图」后 `see_now` 报 `whalebox: 模块 memory 已关闭`，再开回来；
- 关掉一个代挂项 → 重启 DSH → 对应工具确实不见了。
