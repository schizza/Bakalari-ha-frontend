import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { gradeClass } from "./grade-utils";
import { abbr, subjectTitle, type SubjectSummary, type RecentMark } from "./subject-utils";
import { formatDateTime, safeNum as sharedSafeNum } from "../shared/format";

/**
 * bka-subject-card
 * ----------------
 * Lehké (light DOM) zobrazení jednoho "předmětu" v rámci Bakaláři karty.
 * Neobsahuje vlastní styly — spoléhá se na rodičovské CSS třídy (.subj, .sicon, .mark, ...).
 *
 * Vlastnosti:
 *  - subject: SubjectSummary (nutné)
 *  - marks: RecentMark[] (default: [])
 *  - open: boolean (default: false)
 *  - showColors: boolean (default: true)
 *  - limitSubjectMarks: number (default: 0 => bez limitu)
 *  - subjectKey: string (identifikátor pro toggle event)
 *  - formatDate: (iso?: string) => string (default: cs-CZ medium)
 *
 * Události:
 *  - "toggle-subject" (bubbles, composed) s detailem { key: string }
 */
@customElement("bka-subject-card")
export class BkaSubjectCard extends LitElement {
  // Render into light DOM so that parent styles apply directly.
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) accessor subject!: SubjectSummary;
  @property({ attribute: false }) accessor marks: RecentMark[] = [];
  @property({ type: Boolean }) accessor open: boolean = false;
  @property({ attribute: false }) accessor showColors: boolean = true;
  @property({ attribute: false }) accessor limitSubjectMarks: number = 0;
  @property({ attribute: false }) accessor subjectKey: string = "";

  @property({ attribute: false }) accessor formatDate: (iso?: string) => string = (
    iso?: string,
  ) => {
    return formatDateTime(iso);
  };

  private _safeNum(n: any, digits = 3): string {
    return sharedSafeNum(n, digits);
  }

  private _onToggle(ev?: Event) {
    ev?.stopPropagation?.();
    this.dispatchEvent(
      new CustomEvent("toggle-subject", {
        detail: { key: this.subjectKey },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onMarksClick(ev: Event) {
    // Prevent toggling when clicking inside marks list
    ev.stopPropagation();
  }

  private _onKeyDown(ev: KeyboardEvent) {
    // Allow "Enter" or "Space" to trigger toggle (accessibility)
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._onToggle(ev);
    }
  }

  render() {
    const s = this.subject;
    if (!s) return nothing;

    const open = !!this.open;

    const abbrStr = abbr(s.subject_abbr || "");
    const title = subjectTitle(s);
    const count = Number(s.count || 0);
    const avg = this._safeNum(s.avg, 3);
    const wavg = this._safeNum(s.wavg, 3);
    const lastText = s.last_text ? String(s.last_text) : "";
    const lastDate = this.formatDate(s.last_date || "");

    const marks = Array.isArray(this.marks) ? this.marks : [];
    const limit = Math.max(0, Number(this.limitSubjectMarks || 0));
    const mlist = limit > 0 ? marks.slice(0, limit) : marks;

    return html`
      <div
        class=${classMap({ subj: true, open })}
        title=${title}
        role="button"
        aria-expanded=${String(open)}
        tabindex="0"
        @click=${this._onToggle}
        @keydown=${this._onKeyDown}
      >
        <div class="sicon" aria-hidden="true">${abbrStr || "?"}</div>
        <div class="name">
          <div class="title">
            ${title}
            <span class="caret">${open ? "▾" : "▸"}</span>
          </div>
          <div class="sub">
            ${count} známek • Průměr ${avg}${wavg !== "—" ? html` • Vážený ${wavg}` : ""}
          </div>
        </div>
        <div class="meta">
          <div class="kpi">
            <span class="pill"><span class="label">Počet</span> <strong>${count}</strong></span>
            <span class="pill"><span class="label">Ø</span> <strong>${avg}</strong></span>
            ${wavg !== "—"
              ? html`<span class="pill"
                  ><span class="label">WØ</span> <strong>${wavg}</strong></span
                >`
              : null}
          </div>
        </div>
        <div class="last">
          <span class="label">Poslední:</span>
          <span class=${"mark " + gradeClass(lastText, this.showColors)}>${lastText || "—"}</span>
          <span class="theme"></span>
          <span class="date">${lastDate}</span>
        </div>

        ${open
          ? html`<div class="marks" @click=${this._onMarksClick}>
              ${mlist.length
                ? html`<div class="mlist">
                    ${repeat(
                      mlist,
                      (m) => `${m.id}-${m.date}-${m.mark_text}`,
                      (m) => {
                        const mMark = (m.mark_text || "").trim();
                        const mDate = this.formatDate(m.date);
                        const mTheme = (m.theme || "").trim();
                        const mCaption = (m.caption || "").trim();
                        return html`
                          <div class="mrow">
                            <div class=${"m mark " + gradeClass(mMark, this.showColors)}>
                              ${mMark || "—"}
                            </div>
                            <div class="mtitle">${title}</div>
                            <div class="mdate">${mDate}</div>
                            <div class="mtheme">
                              ${mCaption ? html`<span class="badge">${mCaption}</span>` : null}
                              <span class="t">${mTheme || "—"}</span>
                            </div>
                          </div>
                        `;
                      },
                    )}
                  </div>`
                : html`<div class="empty">
                    K tomuto předmětu nejsou dostupné jednotlivé známky (chybí v atributu "recent").
                  </div>`}
            </div>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bka-subject-card": BkaSubjectCard;
  }
}
