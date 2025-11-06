/*
  Bakaláři Messages Card
  -----------------------------------------------------------------
  Usage in Lovelace:
  - type: custom:bakalari-messages-card
    entity: sensor.bakalari_zpravy
    title: 📬 Zprávy
    limit: 100
    sort: desc
    show_search: true
    show_only_unread: false
    allow_html: true
*/

import { registerCard } from "./bakalari-base";

export const CARD_VERSION = "0.2.0";
export const CARD_TYPE = "bakalari-messages-card";
export const CARD_NAME = "Bakaláři Zprávy";

registerCard(
  CARD_TYPE,
  CARD_NAME,
  "Přehledná karta pro zprávy z Bakalářů (klikací, vyhledávání, přílohy).",
);

// ---- Types ----
interface MessageAttachment {
  name?: string;
  url?: string;
}
interface MessageItem {
  id?: string | number;
  title?: string;
  sender?: string;
  text?: string;
  html?: string;
  sent?: string | number | Date;
  read?: boolean;
  attachments?: MessageAttachment[];
}
interface Config {
  type?: string;
  entity: string;
  title?: string;
  limit?: number;
  sort?: "asc" | "desc";
  show_search?: boolean;
  show_only_unread?: boolean;
  allow_html?: boolean;
}
interface HomeAssistantLike {
  states: Record<string, any>;
}

// ---- Component ----
class BakalariMessagesCard extends HTMLElement {
  private _hass!: HomeAssistantLike;
  private _config!: Config;
  private _root: ShadowRoot;
  private _error: string | null = null;

  private _open = new Set<string>();
  private _query = "";
  private _onlyUnread = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }

  // YAML Editor
  static getConfigForm() {
    return {
      schema: [
        { name: "label", selector: { label: {} } },
        { name: "entity", required: true, selector: { entity: {} } },
        { name: "title", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "show_search", selector: { boolean: {} } },
            { name: "show_only_unread", selector: { boolean: {} } },
            {
              name: "sort",
              selector: {
                select: {
                  options: [
                    { value: "desc", label: "Sestupně (nové nahoře)" },
                    { value: "asc", label: "Vzestupně (staré nahoře)" },
                  ],
                },
              },
            },
            { name: "limit", selector: { number: { min: 0 } } },
            { name: "allow_html", selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: (schema: any) => {
        switch (schema.name) {
          case "entity":
            return "Entita";
          case "title":
            return "Titulek";
          case "show_search":
            return "Zobrazit vyhledávání";
          case "show_only_unread":
            return "Zobrazovat jen nepřečtené";
          case "allow_html":
            return "Povolit HTML v těle zprávy";
          case "sort":
            return "Řazení";
          case "limit":
            return "Limit počtu zpráv (0 = bez limitu)";
        }
        return undefined;
      },
      computeHelper: () => undefined,
      assertConfig: (config: Config) => {
        if (!config.entity) throw new Error("Název entity je vyžadován");
      },
    };
  }

  static getStubConfig(): Config {
    return {
      entity: "sensor.bakalari_zpravy",
      title: "📬 Zprávy",
      limit: 100,
      sort: "desc",
      show_search: true,
      show_only_unread: false,
      allow_html: true,
    };
  }

  // ---- Card API ----
  setConfig(config: Config) {
    if (!config?.entity)
      throw new Error("Nastav 'entity' na senzor se zprávami (atribut 'messages').");
    this._config = {
      title: "📬 Zprávy",
      limit: 100,
      sort: "desc",
      show_search: true,
      show_only_unread: false,
      allow_html: true,
      ...config,
      type: `custom:${CARD_TYPE}`,
    };
    // load persisted toggles and inputs
    this._onlyUnread = this._loadBool(
      this._storageKey("only_unread"),
      !!this._config.show_only_unread,
    );
    this._query = this._loadString(this._storageKey("search_query"), "");
    this._render();
  }

  set hass(hass: HomeAssistantLike) {
    this._hass = hass;
    this._render();
  }

  public getGridOptions() {
    return {};
  }

  // ---- Utils & state ----
  //

  connectedCallback() {
    this._root.addEventListener("click", this._onRootClick);
  }

  disconnectedCallback() {
    this._root.removeEventListener("click", this._onRootClick);
  }

  private _onRootClick = (e: Event) => {
    const row = (e.target as Element | null)?.closest(".row") as HTMLElement | null;
    if (!row) return;

    const item = row.closest(".item") as HTMLElement | null;
    if (!item) return;

    const id = item.dataset?.id || "";
    if (!id || !item) return;

    if (this._open.has(id)) this._open.delete(id);
    else this._open.add(id);

    item.classList.toggle("open");
  };

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
      // ignore
    }
  }
  private _loadString(key: string, fallback = "") {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  }
  private _saveString(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  private _escape(s: any) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
  private _linkify(text: string) {
    const esc = this._escape(text).replace(/\n/g, "<br>");
    return esc.replace(/\b(https?:\/\/[^\s<]+)/g, (m) => {
      return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    });
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

  private _computeId(m: MessageItem): string {
    const sent = m.sent ? new Date(m.sent as any).getTime() : 0;
    const title = (m.title || "").trim();
    const sender = (m.sender || "").trim();
    const ownId = m.id != null ? String(m.id) : "";
    return `${ownId}|${sent}|${title}|${sender}`.replace(/\s+/g, "_");
  }

  private _rawMessages(): MessageItem[] {
    this._error = null;
    const eid = this._config?.entity || "";
    const st = this._hass?.states?.[eid];
    if (!st) {
      this._error = `Entita '${eid}' nebyla nalezena. Ujisti se, že zadáváš správný název senzoru.`;
      return [];
    }
    const attrs: any = st.attributes || {};
    let messages: any = attrs.messages ?? attrs.Messages ?? null;
    if (typeof messages === "string") {
      try {
        messages = JSON.parse(messages);
      } catch (e: any) {
        this._error = `Atribut 'messages' není validní JSON: ${e?.message || e}`;
        return [];
      }
    }
    if (!Array.isArray(messages)) {
      this._error =
        "Atribut 'messages' není pole. Dostupné atributy: " + Object.keys(attrs).sort().join(", ");
      return [];
    }
    return messages as MessageItem[];
  }

  private _filtered(messages: MessageItem[]): MessageItem[] {
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
    if (this._onlyUnread) arr = arr.filter((m) => m.read === false);

    const asc = (this._config.sort || "desc").toLowerCase() === "asc";
    arr.sort((a, b) => {
      const at = new Date(a.sent || 0).getTime();
      const bt = new Date(b.sent || 0).getTime();
      return at - bt;
    });
    if (!asc) arr.reverse();

    const limit = Number(this._config.limit || 0);
    if (limit > 0) arr = arr.slice(0, limit);

    return arr;
  }

  private _textHtmlFor(m: MessageItem) {
    if (this._config.allow_html) {
      return this._sanitize(m.html ?? m.text ?? "");
    }
    return this._linkify(m.text || "");
  }

  // ---- Render ----
  private _render() {
    const cfg = this._config;
    if (!cfg) return;

    const messages = this._rawMessages();
    const list = this._filtered(messages);
    const currentIds = new Set(list.map((m) => this._computeId(m)));
    for (const id of Array.from(this._open)) {
      if (!currentIds.has(id)) this._open.delete(id);
    }

    const styles = `
      :host { display:block; }
      ha-card { display:block; }
      .card-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; }
      .title { font-weight:600; font-size:1.1rem; display:flex; align-items:center; gap:.5rem; }
      .tools { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .search {
        min-width:200px; border:1px solid var(--divider-color);
        background: var(--card-background-color); color: var(--primary-text-color);
        border-radius:8px; padding:6px 8px;
      }
      .switch { display:flex; align-items:center; gap:6px; font-size:.9rem; color: var(--secondary-text-color); user-select:none; }
      .wrap { padding: 0 16px 12px 16px; }
      .list { display:flex; flex-direction:column; gap:8px; }
      .item { border:1px solid var(--divider-color); border-radius:12px; overflow:hidden; background: var(--card-background-color); }
      .row { display:flex; gap:10px; align-items:center; padding:10px 12px; cursor:pointer; user-select:none; }
      .bullet { width:8px; height:8px; border-radius:50%; background: var(--accent-color); opacity:.6; }
      .meta { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
      .titleline { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .subline { color: var(--secondary-text-color); font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .date { color: var(--secondary-text-color); font-size:.85rem; }
      .body { padding:0 12px 12px 12px; display:none; -webkit-user-select:text; user-select:text; }
      .item.open .body { display:block; }
      .attachments { margin-top:6px; }
      .attachments a { text-decoration:none; }
      .empty { color: var(--secondary-text-color); padding:8px 0; }
      .unreadOff .bullet { display:none; }
      .tag { font-size:.75rem; padding:2px 6px; border-radius:999px; border:1px solid var(--divider-color); color: var(--secondary-text-color); }
      .error { color: var(--error-color, #c62828); padding: 0 16px 12px; }
    `;

    const header = `
      <div class="card-header">
        <div class="title">${this._escape(cfg.title || "📬 Zprávy")}</div>
        <div class="tools">
          <label class="switch" title="Zobrazit jen nepřečtené">
            <input type="checkbox" id="onlyUnread"${this._onlyUnread ? " checked" : ""}>
            <span>Jen nepřečtené</span>
          </label>
          ${
            cfg.show_search
              ? `<input class="search" id="search" placeholder="Hledat ve zprávách" value="${this._escape(this._query)}">`
              : ""
          }
        </div>
      </div>`;

    const errorBlock = this._error ? `<div class="error">${this._escape(this._error)}</div>` : "";

    const unreadClass = list.some((m) => m.read === false) ? "" : "unreadOff";
    const bodyContent = !this._error
      ? list.length
        ? `<div class="list ${unreadClass}">
            ${list
              .map((m) => {
                const id = this._computeId(m);
                const open = this._open.has(id) ? " open" : "";
                const attachments = Array.isArray(m.attachments) ? m.attachments : [];
                const textHtml = this._textHtmlFor(m);

                const safeAttachments = attachments
                  .filter((a) => !!a?.url && this._allowedUrl(String(a.url)))
                  .map(
                    (a) => `
                      <li><a href="${a.url}" target="_blank" rel="noopener noreferrer">${this._escape(a.name || a.url || "")}</a></li>
                    `,
                  )
                  .join("");

                const attBlock = safeAttachments
                  ? `<div class="attachments">
                      <span class="tag">Přílohy</span>
                      <ul>${safeAttachments}</ul>
                    </div>`
                  : "";

                return `
                  <div class="item${open}" data-id="${this._escape(id)}">
                    <div class="row">
                      <div class="bullet" style="${m.read === false ? "" : "opacity:0.15;"}"></div>
                      <div class="meta">
                        <div class="titleline">${this._escape(m.title || "Bez předmětu")}</div>
                        <div class="subline">${this._escape(m.sender || "Neznámý odesílatel")}</div>
                      </div>
                      <div class="date">${this._escape(this._fmtDate(m.sent))}</div>
                    </div>
                    <div class="body">
                      <div class="text">${textHtml}</div>
                      ${attBlock}
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty">Žádné zprávy k zobrazení.</div>`
      : "";

    this._root.innerHTML = `
      <ha-card>
        <style>${styles}</style>
        ${header}
        ${errorBlock}
        <div class="wrap">
          <div id="body">
            ${bodyContent}
          </div>
        </div>
      </ha-card>
    `;

    // Bind events
    this._root.getElementById("search")?.addEventListener("input", (e: any) => {
      this._query = e?.target?.value || "";
      this._saveString(this._storageKey("search_query"), this._query);
      this._render();
    });
    this._root.getElementById("onlyUnread")?.addEventListener("change", (e: any) => {
      this._onlyUnread = !!e?.target?.checked;
      this._saveBool(this._storageKey("only_unread"), this._onlyUnread);
      this._render();
    });
  }
}

customElements.define(CARD_TYPE, BakalariMessagesCard);

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: BakalariMessagesCard;
  }
}
