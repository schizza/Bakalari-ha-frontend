/**
 * bka-subject-card
 * ----------------
 * Lehké (light DOM) zobrazení jednoho "předmětu" v rámci Bakaláři karty.
 * Neobsahuje vlastní styly — spoléhá se na rodičovské CSS třídy (.subj, .sicon, .mark, ...).
 *
 * Vlastnosti:
 *  - subject: string (nutné) - jméno senzoru s předmětem
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

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { gradeClass } from "./grade-utils";
import { type RecentMark, SubjectSummary, getSubjectInfoAndMarskFromSensor, shortenMark, signMarks } from "./subject-utils";
import { formatDateOnly } from "../shared/format";
import { EyeIcon, EyeOffIcon } from "./icons";
import { signature, spinner } from "../shared/icons";
import { runWithPending } from "../shared/utils";

/**
 * Komponenta pro předmět v Bakaláři.
 */
@customElement("bka-subject-item")
export class BkaSubjectItem extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) accessor subject!: SubjectSummary;
  @property({ attribute: false }) accessor open = false;
  @property({ attribute: false }) accessor showColors = true;
  @property({ attribute: false }) accessor formatDate: (iso?: string) => string = (iso?: string) => formatDateOnly(iso);
  @property({ attribute: false }) accessor hass: any;
  @property({ attribute: false }) accessor subjectKey = "";
  @property({ attribute: false }) accessor _child_key: string = "";
  @state() accessor _pendingToggle = false;

  /**
   * Create new listener on click event
   */
  private _onToggle() {
    this.dispatchEvent(new CustomEvent("toggle-subject", {
      detail: { key: this.subject.sensor_name },
      bubbles: true,
      composed: true
    }));
    // krátké vizuální potvrzení, i když toggle proběhne okamžitě
  }

  private async _signMark(e: Event, id: string, child_key: string) {
    e?.stopPropagation()

    if (!id || !child_key) return;
    await runWithPending(
      (v: boolean) => this._pendingToggle = v,
      signMarks(child_key, [id], this.hass)
    )
  }

  render() {
    const { subject, marks } = getSubjectInfoAndMarskFromSensor(this.hass, this.subject.sensor_name ?? "");
    if (!subject) return nothing;

    const abbrStr = subject.subject_abbr || '';
    const title = subject.subject_name;
    const count = Number(subject.count || 0);
    const avg = String(subject.avg ?? '—');
    const wavg = String(subject.wavg ?? '—');
    const lastText = subject.last_text ? String(subject.last_text) : '';
    const lastDate = this.formatDate(subject.last_date || '');

    return html`
              <div class=${classMap({ subj: true, open: this.open })} @click=${this._onToggle} role="button">
                <div class="sicon" aria-hidden="true">${abbrStr || '?'}</div>
                <div class="name">
                  <div class="title">${title} <span class="caret">${this.open ? '▾' : '▸'}</span></div>
                  <div class="sub">${count} známek • Průměr ${avg}${wavg !== '—' ? html` • Vážený ${wavg}` : ''}</div>
                </div>
                <div class="last">
                  <span class="label">Poslední:</span>
                  <span class=${'mark ' + gradeClass(lastText, this.showColors)}>${lastText || '—'}</span>
                  <span class="date">${lastDate}</span>
                </div>
                ${this.open ? html`
                  <div class="marks">
                    ${repeat(
      marks,
      (m) => `${m.id}-${m.date}-${m.mark_text}`,
      (m) => html`
                        <div class="mrow">
                          <div class=${'m mark ' + gradeClass((m.mark_text || '').trim(), this.showColors)} title="${m.mark_text}">${(shortenMark(m.mark_text) || '').trim() || '—'}</div>
                          <div class="mtitle" title="${m.theme}">${m.theme}</div>
                          <div class="mdate">${this.formatDate(m.date)}</div>
                          <div class="mtheme">
                            ${m.caption ? html`<span class="badge">${m.caption}</span>` : null}
                            <span class="label">
                            ${m.confirmed ? EyeIcon("icon")
          : html`${EyeOffIcon("icon")}
                  <span
                    @click=${(e: Event) =>
              this._signMark(e, m.id!.toString(), this._child_key)
            }>
                  ${this._pendingToggle
              ? spinner("icon-sig", 14)
              : signature("icon-sig")
            }
                  </span>`}
                         </div>
  </div>`
    )}
</div>` : null}
</div>
  `;
  }
}

/**
 * Subject card
 */
@customElement('bka-subject-card-new')
export class BkaSubjectCardNew extends LitElement {
  protected createRenderRoot() { return this; }

  @property({ attribute: false }) accessor subject: SubjectSummary = {};
  @property({ attribute: false }) accessor marksByKey: Record<string, RecentMark[]> = {};
  @property({ attribute: false }) accessor openKeys: Set<string> = new Set();
  @property({ attribute: false }) accessor showColors = true;
  @property({ attribute: false }) accessor formatDate: (iso?: string) => string = (iso?: string) => formatDateOnly(iso);
  @property({ attribute: false }) accessor hass: any;
  @property({ attribute: false }) accessor open = false;
  @property({ attribute: false }) accessor _child_key: string = "";

  render() {
    // return html`
    //   ${repeat(this.subjects, s => s, s => html`
    //     <bka-subject-item-refactor
    //       .subject=${s}
    //       @toggle-subject=${this._onToggle}
    //     ></bka-subject-item-refactor>
    //   `)}
    // `;
    return html`
      <bka-subject-item
        .subject=${this.subject}
        .hass=${this.hass}
        .open=${this.open}
        .showColors=${this.showColors}
        ._child_key=${this._child_key}
      ></bka-subject-item>
      `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bka-subject-card-new": BkaSubjectCardNew;
  }
}
