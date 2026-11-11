# dsh-whalebox

A tiny module registry for [DeepSeek Harness](https://github.com/deepseek-ai) (DSH):
one settings panel, one state file, one place to turn plugins on and off — without
keeping every tool definition in the model's context when it is not needed.

- **5 wrapped module slots** (vision / draw / ops / soul / catalog)
- **4 tools**, gated for real: a disabled module makes its tools fail with
  `whalebox: module <id> is disabled`
- **Adopted plugins**: wrap an already-installed plugin as a `wrapped` module,
  toggled through `cordis.patch.yml` (restart DSH to take effect)
- **No build step, no runtime dependencies**, no personal data or private services

## Install

```bash
dsh plugin --profile desktop add dsh-whalebox
```

Close DSH completely and reopen it. Then `Settings → 鲸箱 (whalebox)`.

Requires DSH `>=0.2.1-rc.2 <0.3.0`, Node `>=20.18`.

## Layout

```
index.js          host half: core, tools, /dsh-whalebox/config
client.js         browser half: the settings panel (hand-written ModuleLoader)
cordis.patch.yml  bundle patch: self by default; adopted entries appended by the panel
templates/        module skeleton (code + doc)
docs/             architecture and rollback notes
```

State lives in `%DSH_HOME%/whalebox/state.json`.

## License

MIT.
