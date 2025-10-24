function c(l) {
  const e = document.createElement("h3");
  return e.textContent = l, e.style.margin = "0.5em 0", e;
}
function p(l, e, t) {
  const r = window;
  r.customCards = r.customCards || [], r.customCards.some((s) => (s == null ? void 0 : s.type) === l) || r.customCards.push({ type: l, name: e, description: t, preview: !1 });
}
class y extends HTMLElement {
  constructor() {
    super(...arguments), this._root = null, this._hass = null, this._stateObj = null, this._config = {
      title: "📬 Zprávy z Bakalářů",
      limit: 100,
      sort: "desc",
      show_search: !0,
      show_only_unread: !1,
      allow_html: !0
    }, this._open = /* @__PURE__ */ new Set(), this._query = "", this._onlyUnread = !1;
  }
  static getStubConfig() {
    return { entity: "sensor.bakalari_zpravy", title: "📬 Zprávy" };
  }
  connectedCallback() {
    const e = this._loadBool(this._storageKey("only_unread"), this._config.show_only_unread);
    this._onlyUnread = e, this._ensureRoot(), this._render();
  }
  setConfig(e) {
    if (!e || !e.entity) throw new Error("bakalari-messages-card: 'entity' je povinné");
    this._config = Object.assign({}, this._config, e), this._onlyUnread = !!this._config.show_only_unread, this._render();
  }
  set hass(e) {
    var t;
    this._hass = e, this._stateObj = (t = e.states) == null ? void 0 : t[this._config.entity], this._render();
  }
  getCardSize() {
    return 3;
  }
  /* ------------ infra ------------ */
  _ensureRoot() {
    var e, t;
    this._root || (this._root = this.attachShadow({ mode: "open" }), this._root.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { display:block; }
        .wrap { padding: 12px 16px; }
        .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .title { font-weight:600; font-size:1.1rem; display:flex; align-items:center; gap:.5rem; }
        .tools { display:flex; gap:8px; align-items:center; }
        input.search {
          min-width:200px; border:1px solid var(--divider-color);
          background: var(--card-background-color); color: var(--primary-text-color);
          border-radius:8px; padding:6px 8px;
        }
        .list { display:flex; flex-direction:column; gap:8px; }
        .item { border:1px solid var(--divider-color); border-radius:12px; overflow:hidden; background: var(--card-background-color); }
        .row { display:flex; gap:10px; align-items:center; padding:10px 12px; cursor:pointer; }
        .bullet { width:8px; height:8px; border-radius:50%; background: var(--accent-color); opacity:.6; }
        .meta { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
        .titleline { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .subline { color: var(--secondary-text-color); font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .date { color: var(--secondary-text-color); font-size:.85rem; }
        .body { padding:0 12px 12px 12px; display:none; }
        .item.open .body { display:block; }
        .attachments { margin-top:6px; }
        .attachments a { text-decoration:none; }
        .empty { color: var(--secondary-text-color); padding:8px 0; }
        .unreadOff .bullet { display:none; }
        .tag { font-size:.75rem; padding:2px 6px; border-radius:999px; border:1px solid var(--divider-color); color: var(--secondary-text-color); }
        .controls { display:flex; align-items:center; gap:10px; }
        .switch { display:flex; align-items:center; gap:6px; font-size:.9rem; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="header">
            <div class="title"></div>
            <div class="tools">
              <div class="controls">
                <label class="switch">
                  <input type="checkbox" id="onlyUnread">
                  <span>Jen nepřečtené</span>
                </label>
              </div>
              <input class="search" id="search" placeholder="Hledat ve zprávách">
            </div>
          </div>
          <div id="body"></div>
        </div>
      </ha-card>
    `, this._root.addEventListener("click", (r) => {
      const n = (r.composedPath ? r.composedPath() : []).find((o) => {
        var a, d;
        return (d = (a = o == null ? void 0 : o.classList) == null ? void 0 : a.contains) == null ? void 0 : d.call(a, "row");
      });
      if (!n) return;
      const i = n.closest(".item");
      i && this._toggle(i.dataset.id || "");
    }), (e = this._root.getElementById("search")) == null || e.addEventListener("input", (r) => {
      var s;
      this._query = ((s = r.target) == null ? void 0 : s.value) || "", this._renderBody();
    }), (t = this._root.getElementById("onlyUnread")) == null || t.addEventListener("change", (r) => {
      var s;
      this._onlyUnread = !!((s = r.target) != null && s.checked), this._saveBool(this._storageKey("only_unread"), this._onlyUnread), this._renderBody();
    }));
  }
  /* ------------ utils ------------ */
  _storageKey(e) {
    var r;
    return `bakalari_messages_${(((r = this._config) == null ? void 0 : r.entity) || "unknown").replace(/\W+/g, "_")}_${e}`;
  }
  _loadBool(e, t = !1) {
    try {
      const r = localStorage.getItem(e);
      return r === null ? t : r === "1";
    } catch {
      return t;
    }
  }
  _saveBool(e, t) {
    try {
      localStorage.setItem(e, t ? "1" : "0");
    } catch {
    }
  }
  _fmtDate(e) {
    if (!e) return "";
    try {
      return (typeof e == "string" || typeof e == "number" ? new Date(e) : e).toLocaleString(void 0, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(e);
    }
  }
  _escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  _linkify(e) {
    return this._escape(e).replace(/\n/g, "<br>").replace(/\b(https?:\/\/[^\s<]+)/g, (r) => `<a href="${r}" target="_blank" rel="noopener noreferrer">${r}</a>`);
  }
  _filtered(e) {
    let t = Array.isArray(e) ? e.slice() : [];
    if (this._query) {
      const n = this._query.toLowerCase();
      t = t.filter(
        (i) => (i.title || "").toLowerCase().includes(n) || (i.sender || "").toLowerCase().includes(n) || (i.text || "").toLowerCase().includes(n)
      );
    }
    this._onlyUnread && (t = t.filter((n) => n.unread === !0));
    const r = (this._config.sort || "desc").toLowerCase() === "asc";
    t.sort((n, i) => new Date(n.sent || 0).getTime() - new Date(i.sent || 0).getTime()), r || t.reverse();
    const s = Number(this._config.limit || 0);
    return s > 0 && (t = t.slice(0, s)), t;
  }
  _toggle(e) {
    e && (this._open.has(e) ? this._open.delete(e) : this._open.add(e), this._renderBody());
  }
  _allowedUrl(e) {
    try {
      const t = new URL(e, window.location.href);
      return t.protocol === "http:" || t.protocol === "https:";
    } catch {
      return !1;
    }
  }
  _sanitize(e) {
    const t = /* @__PURE__ */ new Set([
      "B",
      "STRONG",
      "I",
      "EM",
      "U",
      "BR",
      "P",
      "UL",
      "OL",
      "LI",
      "CODE",
      "PRE",
      "A"
    ]), r = new DOMParser().parseFromString(String(e ?? ""), "text/html"), s = [], n = (i) => {
      if (i.nodeType === Node.TEXT_NODE) {
        s.push(this._escape(i.nodeValue));
        return;
      }
      if (i.nodeType !== Node.ELEMENT_NODE) return;
      const o = i.tagName;
      if (!t.has(o)) {
        i.childNodes.forEach(n);
        return;
      }
      if (o === "A") {
        const a = i.getAttribute("href") || "";
        if (!this._allowedUrl(a)) {
          i.childNodes.forEach(n);
          return;
        }
        s.push(`<a href="${this._escape(a)}" target="_blank" rel="noopener noreferrer">`), i.childNodes.forEach(n), s.push("</a>");
        return;
      }
      if (o === "BR") {
        s.push("<br>");
        return;
      }
      s.push(`<${o.toLowerCase()}>`), i.childNodes.forEach(n), s.push(`</${o.toLowerCase()}>`);
    };
    return r.body.childNodes.forEach(n), s.join("");
  }
  /* ------------ render ------------ */
  _render() {
    if (!this._root) return;
    const e = this._root.querySelector(".title");
    e && (e.innerHTML = "", e.appendChild(c(this._config.title || "📬 Zprávy")));
    const t = this._root.getElementById("onlyUnread");
    t && (t.checked = this._onlyUnread), this._renderBody();
  }
  _renderBody() {
    var o;
    if (!this._root) return;
    const e = this._root.getElementById("body"), t = this._stateObj;
    if (!t) {
      e.innerHTML = `<div class="empty">Entita <b>${this._config.entity}</b> neexistuje.</div>`;
      return;
    }
    const r = ((o = t.attributes) == null ? void 0 : o.messages) || [];
    if (!Array.isArray(r)) {
      e.innerHTML = '<div class="empty">Atribut <code>messages</code> není pole.</div>';
      return;
    }
    const s = this._filtered(r);
    if (!s.length) {
      e.innerHTML = '<div class="empty">Žádné zprávy k zobrazení.</div>';
      return;
    }
    const i = [
      `<div class="list ${s.some((a) => a.unread) ? "" : "unreadOff"}">`,
      ...s.map((a, d) => {
        const u = `${d}-${a.sent ?? ""}-${a.title ?? ""}`.replace(/\s+/g, "_"), _ = this._open.has(u) ? " open" : "", g = Array.isArray(a.attachments) ? a.attachments : [], f = this._config.allow_html ? this._sanitize(a.html ?? a.text ?? "") : this._linkify(a.text || "");
        return `
          <div class="item${_}" data-id="${u}">
            <div class="row">
              <div class="bullet" style="${a.unread ? "" : "opacity:0.15;"}"></div>
              <div class="meta">
                <div class="titleline">${this._escape(a.title || "Bez předmětu")}</div>
                <div class="subline">${this._escape(a.sender || "Neznámý odesílatel")}</div>
              </div>
              <div class="date">${this._fmtDate(a.sent)}</div>
            </div>
            <div class="body">
              <div class="text">${f}</div>
              ${g.length ? `<div class="attachments">
                     <span class="tag">Přílohy</span>
                     <ul>
                       ${g.map(
          (h) => `
                         <li><a href="${h.url}" target="_blank" rel="noopener noreferrer">${this._escape(h.name || h.url)}</a></li>
                       `
        ).join("")}
                     </ul>
                   </div>` : ""}
            </div>
          </div>`;
      }),
      "</div>"
    ].join("");
    e.innerHTML = i;
  }
}
customElements.get("bakalari-messages-card") || customElements.define("bakalari-messages-card", y);
p(
  "bakalari-messages-card",
  "📬 Bakaláři – Zprávy",
  "Přehledná karta pro zprávy z Bakalářů (klikací, vyhledávání, přílohy)."
);
class m extends HTMLElement {
  setConfig(e) {
    this._config = e;
  }
  set hass(e) {
    this.innerHTML = "", this.appendChild(c("Bakaláři – známky"));
    const t = document.createElement("p");
    t.textContent = "Zde budou data o známkách.", this.appendChild(t);
  }
  getCardSize() {
    return 3;
  }
}
customElements.define("bakalari-grades-card", m);
p("bakalari-grades-card", "Bakaláři - známky", "Karta pro zobrazení známek");
class v extends HTMLElement {
  setConfig(e) {
    this._config = e;
  }
  set hass(e) {
    this.innerHTML = "", this.appendChild(c("Bakaláři – rozvrh"));
    const t = document.createElement("p");
    t.textContent = "Zde bude rozvrh.", this.appendChild(t);
  }
  getCardSize() {
    return 3;
  }
}
customElements.define("bakalari-timetable-card", v);
p("bakalari-timetable-card", "Bakaláři - rozvrh hodin", "Zobrazení rozvrhu hodin");
class b extends HTMLElement {
  setConfig(e) {
    this._config = e;
  }
  set hass(e) {
    this.innerHTML = "", this.appendChild(c("Bakaláři – přehled"));
    const t = document.createElement("p");
    t.textContent = "Souhrnný přehled Bakalářů.", this.appendChild(t);
  }
  getCardSize() {
    return 3;
  }
}
customElements.define("bakalari-overview-card", b);
//# sourceMappingURL=bakalari-cards.js.map
