/*
 Bakalari Last Grade card
 -----------------------------------------------------------------
 Usage:

*/

import { registerCard } from "./bakalari-base";
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export const CARD_VERSION = "0.0.1";
export const CARD_TYPE = "bakalari-grades-last";
export const CARD_NAME = "Bakaláři poslední známka";

registerCard(CARD_TYPE, CARD_NAME, "Karta s poslední přijatou známkou.");

/*
  interface Config {
  type?: string;
  entity: string;
  title?: string;
}
*/

@customElement(CARD_TYPE)
export class BakalariGradesLast extends LitElement {
  @property({ attribute: false }) accessor hass: any;
  @state() private accessor _config: any = {};

  static styles = css`
    ha-card {
      overflow: hidden;
    }

    .container {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 14px 16px 16px;
    }

    ha-icon {
      --mdc-icon-size: 22px;
      color: var(--secondary-text-color);
      flex: 0 0 auto;
      margin-top: 2px;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .top {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .mark {
      font-weight: 700;
      font-size: 22px;
      line-height: 1;
      padding: 6px 12px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      color: var(--primary-text-color);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      letter-spacing: 0.2px;
      flex: 0 0 auto;
      min-width: 44px;
      text-align: center;
    }

    .subject {
      font-weight: 700;
      font-size: 18px;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1 1 auto;
    }

    .theme {
      color: var(--secondary-text-color);
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta {
      color: var(--secondary-text-color);
      font-size: 12px;
    }

    .error,
    .empty {
      padding: 12px 16px;
      color: var(--secondary-text-color);
    }
  `;

  setConfig(config: any) {
    if (!config) throw new Error("Chybí konfigurace");
    this._config = config;
  }

  private formatDate(iso?: string): string | undefined {
    if (!iso) return undefined;
    const lang = this.hass?.locale?.language || "cs-CZ";
    try {
      return new Date(iso).toLocaleString(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      } as any);
    } catch {
      return iso;
    }
  }

  render() {
    const name = this._config.name ?? "Poslední známka";
    const entity = this._config.entity;
    const stateObj = entity ? this.hass?.states?.[entity] : undefined;

    if (!entity) {
      return html`<ha-card .header=${name}
        ><div class="empty">Nebyla nastavena entita</div></ha-card
      >`;
    }

    if (!stateObj) {
      return html`<ha-card .header=${name}
        ><div class="error">Entita "${entity}" nenalezena</div></ha-card
      >`;
    }

    const attrs = stateObj.attributes ?? {};
    const last = attrs.last ?? null;
    if (!last || typeof last !== "object") {
      return html`<ha-card .header=${name}><div class="empty">Chybí atribut "last"</div></ha-card>`;
    }

    const icon: string = attrs.icon || "mdi:bookmark";
    const mark: string =
      (last.mark_text && String(last.mark_text)) || (last.caption && String(last.caption)) || "?";

    const subject: string =
      (last.subject_name && String(last.subject_name).trim()) ||
      (last.subject_abbr && String(last.subject_abbr).trim()) ||
      "";

    const theme: string = (last.theme && String(last.theme)) || "";
    const dateStr = this.formatDate(last.date);

    return html`
      <ha-card .header=${name}>
        <div class="container">
          <ha-icon .icon=${icon}></ha-icon>
          <div class="content">
            <div class="top">
              <div class="mark">${mark}</div>
              <div class="subject">${subject || "Neznámý předmět"}</div>
            </div>
            ${theme ? html`<div class="theme">${theme}</div>` : null}
            ${dateStr ? html`<div class="meta">${dateStr}</div>` : null}
          </div>
        </div>
      </ha-card>
    `;
  }
}
