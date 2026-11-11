# Security

- 只监听 `127.0.0.1`；`/dsh-whalebox/config` 先过宿主 `connection.requestRejection`。
- 没有遥测、没有外网请求，不执行外部命令。
- 不读取、不修改任何第三方插件的数据；面板只写 `%DSH_HOME%/whalebox/state.json`
  与鲸箱自己的 `cordis.patch.yml`。
- 端口探测只连 `127.0.0.1`，600ms 超时。

发现问题请开 issue（不要贴包含密钥或完整路径的日志）。
