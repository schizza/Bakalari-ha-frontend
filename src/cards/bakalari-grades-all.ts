/*
  Bakaláři – Všechny známky (subjects grid + recent marks, expandable)
  --------------------------------------------------------------------
  Usage in Lovelace:

  - type: custom:bakalari-grades-all
    entity: sensor.bakalari_grades_all
    name: "Bakaláři – Všechny známky"
    # viditelnost bloků
    show_subjects: true
    show_recent: true
    # limit posledních známek
    limit_recent: 20
    # třídění a filtrování předmětů
    sort_subjects_by: avg        # name|abbr|count|avg|wavg|last_date
    sort_subjects_dir: asc       # asc|desc
    filter_subjects_min_count: 0
    include_subject_ids: []      # např.: ["10"," 2","1N"]
    exclude_subject_ids: []
    limit_subjects: 0            # 0 = bez limitu
    # barvy a perzistence
    show_colors: true
    persist_open_subjects: true

  Expected entity attributes (example):
    - total, new_count, numeric_count, non_numeric_count
    - average, weighted_average
    - by_subject: [
        {
          subject_id, subject_abbr, subject_name,
          count, new_count, numeric_count, non_numeric_count,
          last_text, last_date, avg, wavg
        }, ...
      ]
    - recent: [
        {
          id, date, subject_id, subject_abbr, subject_name,
          caption, theme, mark_text, is_new, is_points,
          points_text, max_points, teacher
        }, ...
      ]
    - icon (optional)
*/

import { registerCard } from "./bakalari-base";
import { LitElement, html } from "lit";
import styles from "./bakalari-grades-all/styles";
import "./bakalari-grades-all/subject-card";
import "./bakalari-grades-all/recent-item";
import {
  groupMarksBySubject,
  filteredSortedSubjectsFromAttrs,
  subjectKeyFromSummary,
} from "./bakalari-grades-all/subject-utils";
import { createPersist } from "./bakalari-grades-all/persist";
import { gradeClass, parseGradeNumber } from "./bakalari-grades-all/grade-utils";
import { formatDateTime, safeNum as formatSafeNum } from "./shared/format";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

export const CARD_VERSION = "0.3.0";
export const CARD_TYPE = "bakalari-grades-all";
export const CARD_NAME = "Bakaláři – Všechny známky";

registerCard(
  CARD_TYPE,
  CARD_NAME,
  "Přehled všech známek: souhrn, předměty (s rozklikem) a poslední známky.",
);

import type { AnyObj, SubjectSummary, RecentMark } from "./bakalari-grades-all/subject-utils";

interface Config {
  type?: string;
  entity: string;
  name?: string;
  title?: string; // alias
  show_subjects?: boolean;
  show_recent?: boolean;

  // recent list
  limit_recent?: number;

  // subjects sorting/filtering
  sort_subjects_by?: "name" | "abbr" | "count" | "avg" | "wavg" | "last_date";
  sort_subjects_dir?: "asc" | "desc";
  filter_subjects_min_count?: number;
  include_subject_ids?: string[]; // normalized by trim()
  exclude_subject_ids?: string[];
  limit_subjects?: number;

  // marks source and limits
  marks_attribute?: string; // which attributes key contains ALL marks (default: "recent", fallback: "all"|"marks")
  limit_subject_marks?: number; // limit of marks shown per subject (0 = no limit)

  // behavior
  show_colors?: boolean;
  persist_open_subjects?: boolean;

  // auto expand subjects with new marks
  auto_expand_new?: boolean; // default false
  auto_expand_days?: number; // how many days back is considered "new" (default 7)
}

@customElement(CARD_TYPE)
export class BakalariGradesAllCard extends LitElement {
  // YAML Editor
  static getConfigForm() {
    return {
      schema: [
        { name: "label", selector: { label: {} } },
        { name: "entity", required: true, selector: { entity: {} } },
        { name: "name", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "show_subjects", selector: { boolean: {} } },
            { name: "show_recent", selector: { boolean: {} } },
            { name: "show_colors", selector: { boolean: {} } },
            { name: "persist_open_subjects", selector: { boolean: {} } },
          ],
        },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "sort_subjects_by",
              selector: {
                select: {
                  options: [
                    { value: "name", label: "Název" },
                    { value: "abbr", label: "Zkratka" },
                    { value: "count", label: "Počet známek" },
                    { value: "avg", label: "Průměr" },
                    { value: "wavg", label: "Vážený průměr" },
                    { value: "last_date", label: "Poslední datum" },
                  ],
                },
              },
            },
            {
              name: "sort_subjects_dir",
              selector: {
                select: {
                  options: [
                    { value: "asc", label: "Vzestupně" },
                    { value: "desc", label: "Sestupně" },
                  ],
                },
              },
            },
            { name: "filter_subjects_min_count", selector: { number: { min: 0 } } },
            { name: "limit_subjects", selector: { number: { min: 0 } } },
          ],
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "limit_recent", selector: { number: { min: 0 } } },
            { name: "limit_subject_marks", selector: { number: { min: 0 } } },
          ],
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "auto_expand_new", selector: { boolean: {} } },
            { name: "auto_expand_days", selector: { number: { min: 0 } } },
          ],
        },
        { name: "marks_attribute", selector: { text: {} } },
        { name: "include_subject_ids", selector: { text: {} } },
        { name: "exclude_subject_ids", selector: { text: {} } },
      ],
      computeLabel: (schema: any) => {
        switch (schema.name) {
          case "entity":
            return "Entita";
          case "name":
            return "Titulek";
          case "show_subjects":
            return "Zobrazit blok Předměty";
          case "show_recent":
            return "Zobrazit blok Poslední známky";
          case "show_colors":
            return "Barevné zvýraznění známek";
          case "persist_open_subjects":
            return "Pamatovat rozbalené předměty";
          case "sort_subjects_by":
            return "Třídit předměty podle";
          case "sort_subjects_dir":
            return "Směr třídění";
          case "filter_subjects_min_count":
            return "Min. počet známek (filtr)";
          case "limit_subjects":
            return "Limit počtu předmětů (0 = bez limitu)";
          case "limit_recent":
            return "Limit posledních známek (0 = bez limitu)";
          case "limit_subject_marks":
            return "Limit známek v předmětu (0 = bez limitu)";
          case "auto_expand_new":
            return "Auto-rozbalit předměty s novými známkami";
          case "auto_expand_days":
            return "Kolik dní zpět je 'nové'";
          case "marks_attribute":
            return "Atribut s VŠEMI známkami (např. recent)";
          case "include_subject_ids":
            return "Zahrnout jen ID předmětů (čárkami)";
          case "exclude_subject_ids":
            return "Vynechat ID předmětů (čárkami)";
        }
        return undefined;
      },
      computeHelper: (schema: any) => {
        switch (schema.name) {
          case "include_subject_ids":
          case "exclude_subject_ids":
            return "Zadej seznam ID oddělený čárkou, např.: 10,  2, 1N";
          case "marks_attribute":
            return "Ve výchozím stavu se použije recent (senzor obsahuje všechny známky).";
        }
        return undefined;
      },
      assertConfig: (config: any) => {
        if (!config?.entity) throw new Error("Název entity je vyžadován");
      },
    };
  }

  static getStubConfig(): any {
    return {
      entity: "sensor.bakalari_grades_all",
      name: "Bakaláři – Všechny známky",
      // viditelnost bloků
      show_subjects: true,
      show_recent: true,
      // limit posledních známek
      limit_recent: 12,
      // třídění a filtrování předmětů
      sort_subjects_by: "name",
      sort_subjects_dir: "asc",
      filter_subjects_min_count: 0,
      include_subject_ids: "",
      exclude_subject_ids: "",
      limit_subjects: 0,
      // zdroj a limity známek
      marks_attribute: "recent",
      limit_subject_marks: 0,
      // chování
      show_colors: true,
      persist_open_subjects: true,
      // auto rozbalení
      auto_expand_new: false,
      auto_expand_days: 7,
      type: `custom:${CARD_TYPE}`,
    };
  }
  @property({ attribute: false }) accessor hass: any;
  @state() private accessor _config: Config = {
    entity: "",
    limit_recent: 12,
    show_subjects: true,
    show_recent: true,
    sort_subjects_by: "name",
    sort_subjects_dir: "asc",
    filter_subjects_min_count: 0,
    include_subject_ids: [],
    exclude_subject_ids: [],
    limit_subjects: 0,
    // marks source and limits
    marks_attribute: "recent",
    limit_subject_marks: 0,
    // behavior
    show_colors: true,
    persist_open_subjects: true,
    // auto expand
    auto_expand_new: false,
    auto_expand_days: 7,
  };

  @state() private accessor _openSubjects: Set<string> = new Set();
  @state() private accessor _autoExpandNew: boolean = false;
  @state() private accessor _autoApplied: boolean = false;
  private _persist: any = null;

  static styles = styles;

  setConfig(config: Config) {
    if (!config || !config.entity) {
      throw new Error("Chybí konfigurace: nastav 'entity'.");
    }
    this._config = {
      limit_recent: 12,
      show_subjects: true,
      show_recent: true,
      sort_subjects_by: "name",
      sort_subjects_dir: "asc",
      filter_subjects_min_count: 0,
      include_subject_ids: [],
      exclude_subject_ids: [],
      limit_subjects: 0,
      // marks source and limits
      marks_attribute: "recent",
      limit_subject_marks: 0,
      // behavior
      show_colors: true,
      persist_open_subjects: true,
      // auto expand
      auto_expand_new: false,
      auto_expand_days: 7,
      ...config,
      type: `custom:${CARD_TYPE}`,
    };
    // načti perzistované rozbalené předměty a přepínač auto-rozbalení
    this._persist = createPersist(this._config.entity);
    if (this._config.persist_open_subjects !== false) {
      this._openSubjects = this._persist.loadSet("open_subjects");
    } else {
      this._openSubjects.clear();
    }
    this._autoExpandNew = this._persist.loadBool("auto_expand_new", !!this._config.auto_expand_new);
    this._autoApplied = false;

    // normalize include/exclude lists (allow comma-separated string or array)
    const toList = (v: any) => {
      if (Array.isArray(v)) return v.map((x) => String(x));
      if (typeof v === "string")
        return v
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      return [];
    };
    // keep original if already array or convert string -> array
    (this._config as any).include_subject_ids = toList(this._config.include_subject_ids);
    (this._config as any).exclude_subject_ids = toList(this._config.exclude_subject_ids);
  }

  private _name(): string {
    return this._config.name || this._config.title || "Bakaláři – Všechny známky";
  }

  private _gradeClass(txt?: string): string {
    return gradeClass(txt, this._config.show_colors !== false);
  }

  private _fmtDate(iso?: string): string {
    const locale = this.hass?.locale?.language || undefined;
    return formatDateTime(iso, { locale });
  }

  private _gradeNumber(txt?: string): number | null {
    return parseGradeNumber(txt);
  }

  private _safeNum(n: any, digits = 3): string {
    return formatSafeNum(n, digits);
  }

  private _icon(attrs: AnyObj): string {
    return attrs?.icon || "mdi:book-education";
  }

  // ---------- Persistence utils ----------

  // ---------- Group & sort ----------

  private _updateOpenSubjects(mutator: (subjects: Set<string>) => void) {
    const copy = new Set(this._openSubjects);
    mutator(copy);
    this._openSubjects = copy;
    if (this._config.persist_open_subjects !== false) {
      this._persist?.saveSet("open_subjects", this._openSubjects);
    }
  }

  private _toggleSubject(key: string, ev?: Event) {
    ev?.stopPropagation?.();
    if (!key) return;
    this._updateOpenSubjects((subjs) => (subjs.has(key) ? subjs.delete(key) : subjs.add(key)));
  }

  private _expandAll(attrs: AnyObj) {
    const list = filteredSortedSubjectsFromAttrs(attrs, this._config);
    this._updateOpenSubjects((subjs) => {
      for (const subj of list) {
        const key = subjectKeyFromSummary(subj);
        if (key) subjs.add(key);
      }
    });
  }

  private _collapseAll() {
    this._updateOpenSubjects((subjs) => {
      subjs.clear();
    });
  }
  private _onToggleAutoExpand(e: any) {
    const v = !!e?.target?.checked;
    this._autoExpandNew = v;
    this._persist?.saveBool("auto_expand_new", v);
    this._autoApplied = false; // re-apply on next render if turning on
  }

  private _applyAutoExpand(attrs: AnyObj) {
    const days = Math.max(0, Number(this._config.auto_expand_days || 7));
    if (!days) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const grouped = groupMarksBySubject(attrs, this._config.marks_attribute);
    let changed = false;
    for (const [key, arr] of grouped.entries()) {
      if (!arr || !arr.length) continue;
      const hasRecent = arr.some((m) => new Date(m.date || 0).getTime() >= cutoff);
      if (hasRecent && !this._openSubjects.has(key)) {
        this._openSubjects.add(key);
        changed = true;
      }
    }
    if (changed && this._config.persist_open_subjects !== false) {
      this._persist?.saveSet("open_subjects", this._openSubjects);
    }
    this._autoApplied = true;
  }
  private _subjectsBlock(attrs: AnyObj) {
    const list: SubjectSummary[] = filteredSortedSubjectsFromAttrs(attrs, this._config);
    if (!list.length) {
      return html`<div class="empty">K předmětům nejsou data.</div>`;
    }
    const grouped = groupMarksBySubject(attrs, this._config.marks_attribute);

    return html`
      <div class="subjects">
        <h4>Předměty</h4>
        <div class="grid">
          ${repeat(
            list,
            (s) => subjectKeyFromSummary(s),
            (s) => {
              const key = subjectKeyFromSummary(s);
              const open = this._openSubjects.has(key);

              const marks = grouped.get(key) || [];

              return html`
                <bka-subject-card
                  .subject=${s}
                  .marks=${marks}
                  .open=${open}
                  .showColors=${this._config.show_colors !== false}
                  .limitSubjectMarks=${this._config.limit_subject_marks || 0}
                  .subjectKey=${key}
                  .formatDate=${(iso: string) => this._fmtDate(iso)}
                  @toggle-subject=${() => this._toggleSubject(key)}
                ></bka-subject-card>
              `;
            },
          )}
        </div>
      </div>
    `;
  }

  private _recentBlock(attrs: AnyObj) {
    const all: RecentMark[] = Array.isArray(attrs?.recent) ? attrs.recent : [];
    if (!all.length) {
      return html`<div class="empty">Žádné poslední známky.</div>`;
    }
    const limit = Math.max(0, Number(this._config.limit_recent ?? 12)) || 0;
    const list = all
      .slice()
      .sort((a, b) => {
        const at = new Date(a.date || 0).getTime();
        const bt = new Date(b.date || 0).getTime();
        return bt - at;
      })
      .slice(0, limit || all.length);

    return html`
      <div class="recent">
        <h4>Poslední známky</h4>
        ${repeat(
          list,
          (m) => m.id ?? `${m.subject_id}-${m.date}-${m.mark_text}`,
          (m) => {
            return html`
              <bka-recent-item
                .mark=${m}
                .showColors=${this._config.show_colors !== false}
                .formatDate=${(iso: string) => this._fmtDate(iso)}
              ></bka-recent-item>
            `;
          },
        )}
      </div>
    `;
  }

  render() {
    const name = this._name();
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass?.states?.[entityId] : undefined;

    if (!entityId) {
      return html`<ha-card .header=${name}
        ><div class="wrap"><div class="error">Nebyla nastavena entita.</div></div></ha-card
      >`;
    }
    if (!stateObj) {
      return html`<ha-card .header=${name}
        ><div class="wrap">
          <div class="error">Entita "${entityId}" nebyla nalezena.</div>
        </div></ha-card
      >`;
    }

    const attrs: AnyObj = stateObj.attributes ?? {};
    const total = Number(attrs.total ?? 0);
    const newCount = Number(attrs.new_count ?? 0);
    const numericCount = Number(attrs.numeric_count ?? 0);
    const nonNumericCount = Number(attrs.non_numeric_count ?? 0);
    const avg = this._safeNum(attrs.average, 3);
    const wavg = this._safeNum(attrs.weighted_average, 3);
    const icon = this._icon(attrs);

    if (this._autoExpandNew && !this._autoApplied) {
      this._applyAutoExpand(attrs);
    }
    const subjects = this._config.show_subjects !== false ? this._subjectsBlock(attrs) : null;
    const recent = this._config.show_recent !== false ? this._recentBlock(attrs) : null;

    return html`
      <ha-card .header=${name}>
        <div class="wrap">
          <div class="tools">
            <button class="btn" @click=${() => this._expandAll(attrs)}>Rozbalit vše</button>
            <button class="btn" @click=${() => this._collapseAll()}>Sbalit vše</button>
            <label class="switch" title="Automaticky rozbalit předměty s novými známkami">
              <input
                type="checkbox"
                .checked=${this._autoExpandNew}
                @change=${(e: any) => this._onToggleAutoExpand(e)}
              />
              <span>Auto-rozbalit nové</span>
            </label>
          </div>
          <div class="summary">
            <ha-icon class="icon" .icon=${icon}></ha-icon>
            <div class="summary-row">
              <span class="chip"><span class="label">Celkem</span> <strong>${total}</strong></span>
              <span class="chip"><span class="label">Ø</span> <strong>${avg}</strong></span>
              ${wavg !== "—"
                ? html`<span class="chip"
                    ><span class="label">WØ</span> <strong>${wavg}</strong></span
                  >`
                : null}
              <span class="chip"
                ><span class="label">Číselné</span> <strong>${numericCount}</strong></span
              >
              <span class="chip"
                ><span class="label">Nečíselné</span> <strong>${nonNumericCount}</strong></span
              >
              ${newCount > 0
                ? html`<span class="chip attn" title="Nově přijaté"
                    ><span class="label">Nové</span> <strong>${newCount}</strong></span
                  >`
                : null}
            </div>
          </div>

          ${subjects} ${recent}
        </div>
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: BakalariGradesAllCard;
  }
}
