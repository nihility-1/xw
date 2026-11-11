/**
 * dsh-whalebox — 浏览器半边：设置页里的「鲸箱」面板。
 * 只做模块开关 + 状态显示；手写 ModuleLoader 包，无需构建。
 */
window.__ModuleLoader__.load({
  id: "dsh-whalebox",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    var h = react.createElement;

    var NS = "whalebox";
    var inject = ["slots", "locale", "configForms"];

    var zh = {
      nav: "鲸箱",
      intro: "鲸箱：一个注册器 + 一组模块。这里只管开关；不会改别的插件的代码或配置。",
      vision: "看图",
      draw: "画图",
      ops: "运维",
      soul: "人格卡",
      catalog: "插件市场",
      pluginsTitle: "第三方插件（下次启动生效）",
      pluginsHint: "核心包不可关；代挂项改的是鲸箱的 patch，重启 DSH 生效。",
      noPlugins: "没扫到第三方插件。"
    };
    var en = {
      nav: "Whalebox",
      intro: "Whalebox: one registry plus a set of modules. This page only flips switches; it never edits other plugins.",
      vision: "Vision",
      draw: "Draw",
      ops: "Ops",
      soul: "Persona",
      catalog: "Plugin catalog",
      pluginsTitle: "Third-party plugins (apply on next launch)",
      pluginsHint: "Core packages are protected; adopted plugins are toggled in whalebox's patch and apply after a DSH restart.",
      noPlugins: "No third-party plugins found."
    };

    var CSS = ".__wb_root{max-width:640px;display:flex;flex-direction:column;gap:8px}" +
      ".__wb_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}" +
      ".__wb_row{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px}" +
      ".__wb_name{flex:1;font-size:13px}" +
      ".__wb_tag{font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}";

    var MODULES = [
      ["vision", "vision"], ["draw", "draw"], ["ops", "ops"],
      ["soul", "soul"], ["catalog", "catalog"]
    ];
    var FALLBACK_NAMES = { vision: "vision", draw: "draw", ops: "ops", soul: "soul", catalog: "catalog" };

    function Panel(props) {
      try { return renderPanel(props); }
      catch (e) { return h("p", { className: "__wb_hint" }, "鲸箱面板渲染出错：" + String((e && e.message) || e)); }
    }

    function renderPanel(props) {
      var t = props.t;
      var st = react.useState(null);
      var state = st[0], setState = st[1];
      var mt = react.useState("");
      var msg = mt[0], setMsg = mt[1];
      var pt = react.useState([]);
      var plugins = pt[0], setPlugins = pt[1];
      var lt = react.useState(null);
      var remoteList = lt[0], setRemoteList = lt[1];

      react.useEffect(function () {
        var alive = true;
        fetch("/dsh-whalebox/config", { credentials: "same-origin", cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (j) { if (alive) { setState((j && j.state) || {}); setPlugins((j && j.plugins) || []); setRemoteList((j && j.moduleList) || null); } })
          .catch(function (e) { if (alive) setMsg("读取设置失败：" + String((e && e.message) || e)); });
        return function () { alive = false; };
      }, []);

      function toggle(id, next) {
        var mods = Object.assign({}, (state && state.modules) || {});
        mods[id] = next;
        setMsg("写入中…");
        fetch("/dsh-whalebox/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ modules: mods })
        }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (j) { setState((j && j.state) || {}); setMsg("已写入"); })
          .catch(function (e) { setMsg("写入失败：" + String((e && e.message) || e)); });
      }

      function togglePlugin(name, next) {
        setMsg("写入中…");
        var body = {}; body[name] = next;
        fetch("/dsh-whalebox/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ plugins: body })
        }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (j) { setState((j && j.state) || {}); setPlugins((j && j.plugins) || []); setMsg(j && j.changed ? "已写入，重启 DSH 生效" : "没变化"); })
          .catch(function (e) { setMsg("写入失败：" + String((e && e.message) || e)); });
      }

      var modules = (state && state.modules) || {};
      return h("div", { className: "__wb_root" },
        h("p", { className: "__wb_hint", style: { margin: "0 0 4px" } }, t("intro")),
        msg ? h("p", { className: "__wb_hint", style: { margin: "0 0 4px" } }, msg) : null,
        state ? null : h("p", { className: "__wb_hint", style: { margin: "0 0 4px" } }, "读取中…"),
        (remoteList || MODULES).map(function (it) {
          var id = it.id || it[0], label = it.name || it[1];
          var on = modules[id] === undefined ? true : !!modules[id];
          return h("div", { className: "__wb_row", key: id },
            h("span", { className: "__wb_name" }, t(label)),
            h("span", { className: "__wb_tag" }, id),
            h("input", { type: "checkbox", checked: on, onChange: function (e) { toggle(id, e.target.checked); } })
          );
        }),
        h("p", { className: "__wb_hint", style: { margin: "8px 0 0" } }, t("pluginsTitle")),
        h("p", { className: "__wb_hint", style: { margin: "0 0 4px" } }, t("pluginsHint")),
        plugins.length === 0
          ? h("p", { className: "__wb_hint" }, t("noPlugins"))
          : plugins.map(function (p) {
              return h("div", { className: "__wb_row", key: "p-" + p.name },
                h("span", { className: "__wb_name" }, p.name),
                h("span", { className: "__wb_tag" }, p.version + (p.protected ? " · 核心" : "")),
                h("input", { type: "checkbox", checked: !!p.enabled, disabled: !!p.protected,
                  onChange: function (e) { togglePlugin(p.name, e.target.checked); } })
              );
            })
      );
    }

    function apply(ctx) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-whalebox";
      tag.textContent = CSS;
      document.head.appendChild(tag);

      var t = function (key) {
        try {
          if (ctx.locale && typeof ctx.locale.bind === "function") return ctx.locale.bind(NS)(key);
        } catch (e) { /* 语言包没挂上也别让面板消失 */ }
        return (zh[key] !== undefined ? zh[key] : key);
      };

      if (ctx.locale && typeof ctx.locale.register === "function") {
        ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }); }, "dsh-whalebox: dictionaries");
      }

      var scope = null;
      try {
        scope = ctx.configForms.get("whalebox") || ctx.configForms.get("dsh-whalebox") || null;
      } catch (e) {
        scope = null;
      }
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register({
          name: "settings.section",
          id: "whalebox",
          order: 40,
          label: "鲸箱"
        }, function (props) {
          return h(Panel, Object.assign({}, props, { scope: scope, t: t }));
        });
      });

      ctx.slots.inject("plugins.bundle.config", function () {
        return ctx.slots.register({
          name: "plugins.bundle.config",
          key: "dsh-whalebox",
          locale: NS
        }, function (props) {
          return h(Panel, Object.assign({}, props, { scope: scope, t: t }));
        });
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
