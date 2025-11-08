import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { gradeClass } from "./grade-utils";
import { abbr, type RecentMark } from "./subject-utils";
import { formatDateTime } from "../shared/format";

/**
 * bka-recent-item
 * ----------------
 * Lehká (light DOM) komponenta pro zobrazení jedné položky "poslední známky".
 * Nepřináší vlastní styly – spoléhá se na CSS třídách rodiče (.item, .mark, .title, .date, .theme, .badge).
 *
 * Vlastnosti:
 *  - mark: RecentMark (nutné)
 *  - showColors: boolean (default: true)
 *  - formatDate: (iso?: string) => string (default: cs-CZ medium)
 */
@customElement("bka-recent-item")
export class BkaRecentItem extends LitElement {
  // Render do light DOM, aby se aplikovaly styly z nadřazené karty.
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) accessor mark!: RecentMark;
  @property({ attribute: false }) accessor showColors: boolean = true;

  @property({ attribute: false }) accessor formatDate: (iso?: string) => string = (
    iso?: string,
  ) => {
    return formatDateTime(iso);
  };

  render() {
    const m = this.mark;
    if (!m) return nothing;

    const subj = (m.subject_name || abbr(m.subject_abbr) || "Neznámý předmět").trim();
    const theme = (m.theme || "").trim();
    const caption = (m.caption || "").trim();
    const markText = (m.mark_text || "").trim();
    const date = this.formatDate(m.date);

    return html`
      <div class="item">
        <div class=${"mark " + gradeClass(markText, this.showColors)}>${markText || "—"}</div>
        <div class="title">${subj}</div>
        <div class="date">${date}</div>
        <div class="theme">
          ${caption ? html`<span class="badge" title="Typ">${caption}</span>` : null}
          <span class="t">${theme || "—"}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bka-recent-item": BkaRecentItem;
  }
}
