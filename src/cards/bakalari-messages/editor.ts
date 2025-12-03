import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Config } from "../bakalari-messages";
import { createPersist } from "../bakalari-grades-all/persist";

/**
 * Config editor for Bakaláři – Zprávy
 * -----------------------------------
 * Používá ha-form pro generování YAML konfigurace.
 *
 * Schéma konfigurace:
 *  - entity: string (required)
 *  - name: string (alias k title)
 *  - show_search: boolean
 *  - show_only_unread: boolean
 *  - sort: "asc" | "desc"
 *  - limit: number (>=0)
 *  - allow_html: boolean
 */
@customElement("bakalari-messages-editor")
export class BakalariMessagesEditor extends LitElement {
  // Render to light DOM to inherit HA styles
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) public accessor hass: any;
  @state() private accessor _config: Config | undefined;
  @state() private accessor _persistCleared: boolean = false;

  setConfig(config: Config) {
    // přenes hodnoty; editor pracuje nad "name", ale karta umí i alias "title"
    const name = (config as any).name ?? (config as any).title;
    this._config = {
      ...config,
      ...(name != null ? { name } : {}),
    };
  }

  private _emitConfigChanged() {
    if (!this._config) return;
    // emituj změnu configu do Lovelace
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onValueChanged(e: any) {
    if (!this._config) return;
    const value = e?.detail?.value;
    if (!value) return;
    this._config = { ...(this._config as any), ...value };
    this._emitConfigChanged();
  }

  private _computeLabel = (schema: any) => {
    switch (schema.name) {
      case "entity":
        return "Entita";
      case "name":
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
  };

  private _clearPersist = () => {
    const entity = this._config?.entity;
    if (!entity) return;
    const p = createPersist(entity, { prefix: "bakalari_messages" });
    p.remove("open_ids");
    p.remove("only_unread");
    p.remove("search_query");
    this._persistCleared = true;
    // automaticky skrýt hlášku po chvíli
    setTimeout(() => (this._persistCleared = false), 2000);
  };

  render() {
    if (!this._config) return nothing;

    const schema = [
      { name: "entity", selector: { entity: {} } },
      { name: "name", selector: { text: {} } },
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
    ];

    const entity = this._config.entity;

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._onValueChanged}
        ></ha-form>

        <div class="inline-actions">
          <button type="button" ?disabled=${!entity} @click=${this._clearPersist}>
            Vymazat uložené stavy (otevřené položky, filtr, hledání)
          </button>
          ${this._persistCleared
        ? html`<span class="msg">Vymazáno</span>`
        : nothing}
        </div>
      </div>

      <style>
        .card-config { display: block; }
        .inline-actions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .inline-actions .msg {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        button[type="button"] {
          padding: 6px 10px;
          cursor: pointer;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bakalari-messages-editor": BakalariMessagesEditor;
  }
}
