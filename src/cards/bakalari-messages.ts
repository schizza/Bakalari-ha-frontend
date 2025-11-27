/*
  Bakaláři – Zprávy (LitElement)
  ------------------------------
  Usage in Lovelace:

  - type: custom:bakalari-messages-card
    entity: sensor.bakalari_zpravy
    title: "📬 Zprávy"
    limit: 100
    sort: desc
    show_search: true
    show_only_unread: false
    allow_html: true
*/

import { registerCard } from "./bakalari-base";
import { LitElement, html, nothing } from "lit";
import styles from "./bakalari-messages/styles";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { createPersist } from "./bakalari-grades-all/persist";
import { formatDateOnly } from "./shared/format";
import { signature } from "./shared/icons";

export const CARD_VERSION = "0.3.0";
export const CARD_TYPE = "bakalari-messages-card";
export const CARD_NAME = "Bakaláři – Zprávy";

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
  mid?: string | number;
  title?: string;
  sender?: string;
  text?: string;
  html?: string;
  sent?: string | number | Date;
  read?: boolean;
  attachments?: MessageAttachment[];
  child_key?: string;
}

export interface Config {
  type?: string;
  entity: string;
  name?: string;
  title?: string; // alias
  limit?: number;
  sort?: "asc" | "desc";
  show_search?: boolean;
  show_only_unread?: boolean;
  allow_html?: boolean;
}

@customElement(CARD_TYPE)
export class BakalariMessagesCard extends LitElement {
  // HA runtime
  @property({ attribute: false }) accessor hass: any;

  // Config
  @state() private accessor _config: Config = {
    entity: "",
    name: "📬 Zprávy",
    limit: 100,
    sort: "desc",
    show_search: true,
    show_only_unread: false,
    allow_html: true,
  };

  @state() private accessor _error: string | null = null;

  // UI state
  @state() private accessor _openIds: Set<string> = new Set();
  @state() private accessor _query: string = "";
  @state() private accessor _onlyUnread: boolean = false;
  @state() private accessor _loadingIds: Set<string> = new Set();
  @state() private accessor _optimisticRead: Set<string> = new Set();

  private _persist: ReturnType<typeof createPersist> | null = null;
  private _searchTimer: number | undefined;

  // YAML Editor (minimal - rely on manual YAML or external editor)
  static getConfigForm() {
    return {
      assertConfig: (config: any) => {
        if (!config?.entity) throw new Error("Název entity je vyžadován");
      },
    };
  }

  static async getConfigElement() {
    await import("./bakalari-messages/editor");
    return document.createElement("bakalari-messages-editor");
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
      type: `custom:${CARD_TYPE}`,
    };
  }

  setConfig(config: Config) {
    if (!config?.entity) {
      throw new Error("Nastav 'entity' na senzor se zprávami (atribut 'messages').");
    }
    this._config = {
      name: "📬 Zprávy",
      limit: 100,
      sort: "desc",
      show_search: true,
      show_only_unread: false,
      allow_html: true,
      ...config,
      type: `custom:${CARD_TYPE}`,
    };

    // Persistence (separate namespace for messages card)
    this._persist = createPersist(this._config.entity, { prefix: "bakalari_messages" });
    this._onlyUnread = !!this._persist.loadBool("only_unread", !!this._config.show_only_unread);
    this._query = this._persist.loadRaw("search_query") ?? "";

    // restore opened items if present
    const open = this._persist.loadSet("open_ids");
    this._openIds = open && open.size ? open : new Set(this._openIds);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchTimer !== undefined) {
      clearTimeout(this._searchTimer);
      this._searchTimer = undefined;
    }
  }

  private _name(): string {
    return this._config.name || this._config.title || "📬 Zprávy";
  }

  // ---- Data helpers ----

  private _computeId(m: MessageItem): string {
    const sent = m.sent ? new Date(m.sent as any).getTime() : 0;
    const title = (m.title || "").trim();
    const sender = (m.sender || "").trim();
    const ownId = m.mid != null ? String(m.mid) : "";
    return `${ownId}|${sent}|${title}|${sender}`.replace(/\s+/g, "_");
  }

  private _rawMessages(): MessageItem[] {
    this._error = null;
    const eid = this._config?.entity || "";
    const st = this.hass?.states?.[eid];
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
    messages = messages.map((m: any) => ({ ...m, child_key: attrs.child_key })
    );
    return messages as MessageItem[];
  }

  private _filtered(messages: MessageItem[]): MessageItem[] {
    let arr = Array.isArray(messages) ? messages.slice() : [];
    const q = (this._query || "").toLowerCase().trim();
    if (q) {
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

    const limit = Math.max(0, Number(this._config.limit || 0));
    if (limit > 0) arr = arr.slice(0, limit);

    return arr;
  }

  // ---- Safe HTML helpers ----

  private _escape(s: any) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private _allowedUrl(href: string) {
    try {
      const u = new URL(href, window.location.href);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  private _linkify(text: string) {
    const esc = this._escape(text).replace(/\n/g, "<br>");
    return esc.replace(/\b(https?:\/\/[^\s<]+)/g, (m) => {
      return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    });
  }

  private _sanitize(htmlStr: any) {
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
    const doc = new DOMParser().parseFromString(String(htmlStr ?? ""), "text/html");
    const out: string[] = [];

    const walk = (node: any) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parentTag = node.parentElement?.tagName || "";
        if (parentTag === "A") {
          out.push(this._escape(node.nodeValue));
        } else {
          out.push(this._linkify(String(node.nodeValue ?? "")));
        }
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

      const tagLower = tag.toLowerCase();
      out.push(`<${tagLower}>`);
      node.childNodes.forEach(walk);
      out.push(`</${tagLower}>`);
    };

    doc.body.childNodes.forEach(walk);
    return out.join("");
  }

  private _textHtmlFor(m: MessageItem) {
    if (this._config.allow_html) {
      return this._sanitize(m.html ?? m.text ?? "");
    }
    return this._linkify(m.text || "");
  }

  private _fmtDate(iso?: string | number | Date): string {
    const locale = this.hass?.locale?.language || undefined;
    return formatDateOnly(iso, { locale, dateStyle: "short" });
  }

  private _toast(message: string, duration = 3000) {
    try {
      this.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message, duration },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      // Fallback to notification event; log for developers to see in console.
      // This can happen in older HA versions or outside HA environment.
      console.warn("Failed to emit 'show-toast' event:", err);
    }
    // Fallback notification event
    this.dispatchEvent(
      new CustomEvent("hass-notification", {
        detail: { message },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---- Events ----
  private async _signMessage(id: string, msgId: string, child_key: string, e?: Event) {
    e?.stopPropagation?.();
    const entityId = this._config?.entity || "";
    if (!id || !msgId || !entityId || !this.hass) return;

    // Optional artificial delay for dev/testing (set in YAML: dev_delay_ms)
    const delay = 2000;
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // set loading + optimistic read
    const nextLoading = new Set(this._loadingIds);
    nextLoading.add(id);
    this._loadingIds = nextLoading;

    const nextOpt = new Set(this._optimisticRead);
    nextOpt.add(id);
    this._optimisticRead = nextOpt;

    try {
      if (delay) await sleep(delay);
      // Mark the message as read (expects a service provided by the Bakaláři integration)
      console.log("Calling service: " + entityId + " with msg id: " + msgId + " child_key: " + child_key)
      await this.hass.callService("bakalari", "mark_message_as_read", {
        entity_id: entityId,
        message_id: msgId,
        child_key: child_key
      });

      this._toast("Zpráva označena jako přečtená.");
    } catch (err) {
      // revert optimistic on error
      const backOpt = new Set(this._optimisticRead);
      backOpt.delete(id);
      this._optimisticRead = backOpt;

      this._toast("Nepodařilo se označit zprávu jako přečtenou.", 4000);
      console.warn("Failed to call bakalari.mark_message_read", err);
    }
    // refresh!!
    try {
      if (delay) await sleep(delay);
      // Refresh the entity to fetch updated messages
      await this.hass.callService("bakalari", "_srv_mark_message_as_read", {
        entity_id: entityId, message_id: msgId, child_key: child_key
      });
    } catch (err) {
      console.warn("Failed to refresh entity", err);
    } finally {
      const doneLoading = new Set(this._loadingIds);
      doneLoading.delete(id);
      this._loadingIds = doneLoading;
    }
  }
  private _toggleOpen(id: string, e?: Event) {
    e?.stopPropagation?.();
    if (!id) return;
    if (this._loadingIds.has(id)) return; // ignore toggling while loading
    const next = new Set(this._openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._openIds = next;
    this._persist?.saveSet("open_ids", this._openIds);
  }

  private _onToggleUnread(e: Event) {
    const v = !!(e.target as HTMLInputElement)?.checked;
    this._onlyUnread = v;
    this._persist?.saveBool("only_unread", v);
  }

  private _onSearchInput(e: Event) {
    const v = (e.target as HTMLInputElement)?.value ?? "";
    // debounce storing; state updates instantly
    this._query = v;
    if (this._searchTimer !== undefined) clearTimeout(this._searchTimer);
    this._searchTimer = window.setTimeout(() => {
      this._persist?.saveRaw("search_query", this._query);
      this._searchTimer = undefined;
    }, 150);
  }

  // ---- Render ----

  static styles = styles;

  render() {
    const name = this._name();
    const entityId = this._config.entity;

    if (!entityId) {
      return html`<ha-card .header=${name}
        ><div class="wrap"><div class="error">Nebyla nastavena entita.</div></div></ha-card
      >`;
    }

    const stateObj = this.hass?.states?.[entityId];
    if (!stateObj) {
      return html`<ha-card .header=${name}
        ><div class="wrap">
          <div class="error">Entita "${entityId}" nebyla nalezena.</div>
        </div></ha-card
      >`;
    }

    const messages = this._rawMessages();
    const list = this._filtered(messages);

    // keep open set synced with visible ids
    const currentIds = new Set(list.map((m) => this._computeId(m)));
    if (this._openIds.size) {
      const next = new Set(this._openIds);
      for (const id of this._openIds) if (!currentIds.has(id)) next.delete(id);
      if (next.size !== this._openIds.size) {
        this._openIds = next;
        this._persist?.saveSet("open_ids", this._openIds);
      }
    }

    return html`
      <ha-card .header=${name}>
        <div class="tools">
          <label class="switch" title="Zobrazit jen nepřečtené">
            <input type="checkbox" .checked=${this._onlyUnread} @change=${this._onToggleUnread} />
            <span>Jen nepřečtené</span>
          </label>
          ${this._config.show_search !== false
        ? html`<input
                class="search"
                id="search"
                placeholder="Hledat ve zprávách"
                .value=${this._query}
                @input=${this._onSearchInput}
              />`
        : nothing}
        </div>

        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}

        <div class="wrap">
          ${!this._error
        ? list.length
          ? html`<div class=${classMap({ list: true, unreadOff: !list.some((m) => m.read === false && !this._optimisticRead.has(this._computeId(m))) })}>
                  ${repeat(
            list,
            (m) => this._computeId(m),
            (m) => {
              const id = this._computeId(m);
              const open = this._openIds.has(id);
              const attachments = Array.isArray(m.attachments) ? m.attachments : [];
              const safeAtts = attachments.filter((a) => !!a?.url && this._allowedUrl(String(a.url)));

              const htmlText = this._textHtmlFor(m);

              return html`<div class=${classMap({ item: true, open })} data-id=${id}>
                        <div class=${classMap({ row: true, loading: this._loadingIds.has(id) })} style=${this._loadingIds.has(id) ? "cursor: progress;" : ""} @click=${(e: Event) => this._toggleOpen(id, e)}>
                          <div class="bullet" style=${(m.read === false && !this._optimisticRead.has(id)) ? "" : "opacity:0.15;"}></div>
                          <div class="meta">
                            <div class="titleline">${m.title || "Bez předmětu"}</div>
                            <div class="subline">${m.sender || "Neznámý odesílatel"}</div>
                          </div>
                          <div class="date">${this._fmtDate(m.sent || "")}</div>
                          ${this._loadingIds.has(id)
                  ? html`<div class="icon-sig" style="cursor: progress;" title="Označování…"><svg class="spinner" viewBox="0 0 50 50" width="24" height="24" role="img" aria-label="Načítání"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="90 150"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg></div>`
                  : html`<div class="icon-sig" style="cursor: pointer;" title="Označit jako přečtené" @click=${(e: Event) => this._signMessage(id, (m?.mid) ? String(m.mid) : "", m.child_key ?? "", e)}>${signature("icon-sig")}</div>`}
                        </div>
                        <div class="body">
                          <div class="text">${unsafeHTML(htmlText)}</div>
                          ${safeAtts.length
                  ? html`<div class="attachments">
                                <span class="tag">Přílohy</span>
                                <ul>
                                  ${safeAtts.map((a) => {
                    const href = String(a.url);
                    const label = a.name || href;
                    return html`<li>
                                      <a href=${href} target="_blank" rel="noopener noreferrer">${label}</a>
                                    </li>`;
                  })}
                                </ul>
                              </div>`
                  : nothing}
                        </div>
                      </div>`;
            },
          )}
                </div>`
          : html`<div class="empty">Žádné zprávy k zobrazení.</div>`
        : nothing}
        </div>
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: BakalariMessagesCard;
  }
}
