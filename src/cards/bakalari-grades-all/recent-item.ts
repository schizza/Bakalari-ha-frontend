import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { gradeClass } from "./grade-utils";
import { abbr, signMarks, type RecentMark } from "./subject-utils";
import { formatDateOnly } from "../shared/format";
import { EyeIcon, EyeOffIcon } from "./icons";
import { signature } from "../shared/icons";
import { runWithPending } from "../shared/utils";
import { spinner } from "../shared/icons";

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
  @property({ attribute: false }) accessor formatDate: (iso?: string) => string = (iso?: string) => formatDateOnly(iso);
  @property({ attribute: false }) accessor child_key!: string;
  @property({ attribute: false }) accessor hass: any;
  @state() accessor _pendingSign: boolean = false;

  private async _onSignClick(e: Event, id?: string) {
    e?.stopPropagation?.();
    if (!id || this._pendingSign) return;

    await runWithPending((v: boolean) => (this._pendingSign = v),
      signMarks(this.child_key, [id], this.hass),
      500);
  }

  render() {
    const m = this.mark;
    if (!m) return nothing;

    const subj = (m.subject_name || abbr(m.subject_abbr) || "Neznámý předmět").trim();
    const theme = (m.theme || "").trim();
    const caption = (m.caption || "").trim();
    const markText = (m.mark_text || "").trim();

    return html`
      <div class="item">
        <div class=${"mark " + gradeClass(markText, this.showColors)}>${markText || "—"}</div>
        <div class="title">${subj}</div>
        <div class="date">${this.formatDate(m.date)}</div>
        <div class="icons">
          <span class="t" title=${m.confirmed ? "Podepsáno" : "Nepodepsáno"}> ${m.confirmed ? EyeIcon("icon") : EyeOffIcon("icon")}
          </span>
          ${(m.confirmed) ? nothing
        : m.id ? html`<span class="t" title="Podepsat" @click=${(e: Event) => this._onSignClick(e, m.id as string)}>
                  ${this._pendingSign ? spinner("icon-sig", 20) : signature("icon-sig")}
                </span>`
          : nothing
      }
        </div >
  <div class="theme" >
    ${caption ? html`<span class="badge" title="Typ">${caption}</span>` : null}
<span class="t" > ${theme || "—"} </span>
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
