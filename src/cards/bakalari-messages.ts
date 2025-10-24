/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCardHeader } from "./bakalari-base";
import { registerCard } from "./bakalari-base";

class BakalariMessages extends HTMLElement {
  static getStubConfig() {
    return { entity: "sensor.bakalari_zpravy", title: "📬 Zprávy" };
  }

  private _root: ShadowRoot | null = null;
  private _hass: any = null;
  private _stateObj: any = null;
  private _config: any = {
    title: "📬 Zprávy z Bakalářů",
    limit: 100,
    sort: "desc",
    show_search: true,
    show_only_unread: false,
    allow_html: true,
  };
  private _open = new Set<string>();
  private _query = "";
  private _onlyUnread = false;

  connectedCallback() {
    const saved = this._loadBool(this._storageKey("only_unread"), this._config.show_only_unread);
    this._onlyUnread = saved;
    this._ensureRoot();
    this._render();
  }

  public setConfig(config: any) {
    if (!config || !config.entity) throw new Error("bakalari-messages-card: 'entity' je povinné");
    this._config = Object.assign({}, this._config, config);
    this._onlyUnread = !!this._config.show_only_unread;
    this._render();
  }

  public set hass(hass: any) {
    this._hass = hass;
    this._stateObj = hass.states?.[this._config.entity];
    this._render();
  }

  public getCardSize() {
    return 3;
  }

  /* ------------ infra ------------ */
  private _ensureRoot() {
    if (this._root) return;
    this._root = this.attachShadow({ mode: "open" });

    this._root.innerHTML = `
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
    `;

    // Delegated listener – toggle body
    this._root.addEventListener("click", (e: Event) => {
      // @ts-ignore
      const path: Element[] = e.composedPath ? e.composedPath() : [];
      const row = path.find((el: any) => el?.classList?.contains?.("row"));
      if (!row) return;
      const item = (row as HTMLElement).closest(".item") as HTMLElement | null;
      if (!item) return;
      this._toggle(item.dataset.id || "");
    });

    // Search / switch
    this._root.getElementById("search")?.addEventListener("input", (e: any) => {
      this._query = e.target?.value || "";
      this._renderBody();
    });
    this._root.getElementById("onlyUnread")?.addEventListener("change", (e: any) => {
      this._onlyUnread = !!e.target?.checked;
      this._saveBool(this._storageKey("only_unread"), this._onlyUnread);
      this._renderBody();
    });
  }

  /* ------------ utils ------------ */
  private _storageKey(suffix: string) {
    const ent = (this._config?.entity || "unknown").replace(/\W+/g, "_");
    return `bakalari_messages_${ent}_${suffix}`;
  }
  private _loadBool(key: string, fallback = false) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      return v === "1";
    } catch {
      return fallback;
    }
  }
  private _saveBool(key: string, value: boolean) {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // no-op
    }
  }

  private _fmtDate(d: any) {
    if (!d) return "";
    try {
      const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(d);
    }
  }
  private _escape(s: any) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  private _linkify(text: string) {
    const esc = this._escape(text).replace(/\n/g, "<br>");
    return esc.replace(/\b(https?:\/\/[^\s<]+)/g, (m) => {
      return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    });
  }
  private _filtered(messages: any[]) {
    let arr = Array.isArray(messages) ? messages.slice() : [];
    if (this._query) {
      const q = this._query.toLowerCase();
      arr = arr.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(q) ||
          (m.sender || "").toLowerCase().includes(q) ||
          (m.text || "").toLowerCase().includes(q),
      );
    }
    if (this._onlyUnread) arr = arr.filter((m) => m.unread === true);
    const asc = (this._config.sort || "desc").toLowerCase() === "asc";
    arr.sort((a, b) => new Date(a.sent || 0).getTime() - new Date(b.sent || 0).getTime());
    if (!asc) arr.reverse();
    const limit = Number(this._config.limit || 0);
    if (limit > 0) arr = arr.slice(0, limit);
    return arr;
  }
  private _toggle(id: string) {
    if (!id) return;
    if (this._open.has(id)) this._open.delete(id);
    else this._open.add(id);
    this._renderBody();
  }

  private _allowedUrl(href: string) {
    try {
      const u = new URL(href, window.location.href);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  private _sanitize(html: any) {
    // Safe reconstruction of allowed tags only
    const allowedTags = new Set([
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
      "A",
    ]);
    const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
    const out: string[] = [];

    const walk = (node: any) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out.push(this._escape(node.nodeValue));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName;
      if (!allowedTags.has(tag)) {
        node.childNodes.forEach(walk);
        return;
      }

      if (tag === "A") {
        const href = node.getAttribute("href") || "";
        if (!this._allowedUrl(href)) {
          node.childNodes.forEach(walk);
          return;
        }
        out.push(`<a href="${this._escape(href)}" target="_blank" rel="noopener noreferrer">`);
        node.childNodes.forEach(walk);
        out.push(`</a>`);
        return;
      }

      if (tag === "BR") {
        out.push("<br>");
        return;
      }

      out.push(`<${tag.toLowerCase()}>`);
      node.childNodes.forEach(walk);
      out.push(`</${tag.toLowerCase()}>`);
    };

    doc.body.childNodes.forEach(walk);
    return out.join("");
  }

  /* ------------ render ------------ */
  private _render() {
    if (!this._root) return;
    // title s malým badge verze (createCardHeader dělá (vX.Y.Z))
    const header = this._root.querySelector(".title");
    if (header) {
      header.innerHTML = "";
      header.appendChild(createCardHeader(this._config.title || "📬 Zprávy"));
    }
    const chk = this._root.getElementById("onlyUnread") as HTMLInputElement | null;
    if (chk) chk.checked = this._onlyUnread;
    this._renderBody();
  }

  private _renderBody() {
    if (!this._root) return;
    const container = this._root.getElementById("body");
    const state = this._stateObj;

    if (!state) {
      container!.innerHTML = `<div class="empty">Entita <b>${this._config.entity}</b> neexistuje.</div>`;
      return;
    }
    const messages = state.attributes?.messages || [];
    if (!Array.isArray(messages)) {
      container!.innerHTML = `<div class="empty">Atribut <code>messages</code> není pole.</div>`;
      return;
    }

    const list = this._filtered(messages);
    if (!list.length) {
      container!.innerHTML = `<div class="empty">Žádné zprávy k zobrazení.</div>`;
      return;
    }

    const unreadClass = list.some((m: any) => m.unread) ? "" : "unreadOff";
    const html = [
      `<div class="list ${unreadClass}">`,
      ...list.map((m: any, idx: number) => {
        const id = `${idx}-${m.sent ?? ""}-${m.title ?? ""}`.replace(/\s+/g, "_");
        const open = this._open.has(id) ? " open" : "";
        const attachments = Array.isArray(m.attachments) ? m.attachments : [];

        const textHtml = this._config.allow_html
          ? this._sanitize(m.html ?? m.text ?? "")
          : this._linkify(m.text || "");

        return `
          <div class="item${open}" data-id="${id}">
            <div class="row">
              <div class="bullet" style="${m.unread ? "" : "opacity:0.15;"}"></div>
              <div class="meta">
                <div class="titleline">${this._escape(m.title || "Bez předmětu")}</div>
                <div class="subline">${this._escape(m.sender || "Neznámý odesílatel")}</div>
              </div>
              <div class="date">${this._fmtDate(m.sent)}</div>
            </div>
            <div class="body">
              <div class="text">${textHtml}</div>
              ${
                attachments.length
                  ? `<div class="attachments">
                     <span class="tag">Přílohy</span>
                     <ul>
                       ${attachments
                         .map(
                           (a: any) => `
                         <li><a href="${a.url}" target="_blank" rel="noopener noreferrer">${this._escape(a.name || a.url)}</a></li>
                       `,
                         )
                         .join("")}
                     </ul>
                   </div>`
                  : ""
              }
            </div>
          </div>`;
      }),
      `</div>`,
    ].join("");

    container!.innerHTML = html;
  }
}

if (!customElements.get("bakalari-messages-card")) {
  customElements.define("bakalari-messages-card", BakalariMessages);
}

registerCard(
  "bakalari-messages-card",
  "📬 Bakaláři – Zprávy",
  "Přehledná karta pro zprávy z Bakalářů (klikací, vyhledávání, přílohy).",
);
