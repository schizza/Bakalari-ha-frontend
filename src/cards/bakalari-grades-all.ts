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
  getSubjectsSensorNames,
  getRecentMarks,
  sortSubjects,
} from "./bakalari-grades-all/subject-utils";
import { createPersist } from "./bakalari-grades-all/persist";
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

import type { AnyObj, RecentMark } from "./bakalari-grades-all/subject-utils";

/**
 * Core configuration for the Bakaláři grades card.
 */
export interface Config {
  type?: string;
  entity: string;
  name?: string;
  title?: string; // alias
  show_subjects?: boolean;
  show_recent?: boolean;

  // recent list
  limit_recent?: number;
  recent_on_top: boolean;
  reflect_subjects_in_recent?: boolean;

  // subjects sorting/filtering
  sort_subjects_by?: "name" | "abbr" | "count" | "avg" | "wavg" | "last_date";
  sort_subjects_dir?: "asc" | "desc";
  filter_subjects_min_count?: number;
  include_subject_sensors?: string[];
  exclude_subject_sensors?: string[];
  limit_subjects?: number;

  // marks source and limits
  limit_subject_marks?: number; // limit of marks shown per subject (0 = no limit)

  // behavior
  show_colors?: boolean;
  persist_open_subjects?: boolean;

  // auto expand subjects with new marks
  auto_expand_new?: boolean; // default false
  auto_expand_days?: number; // how many days back is considered "new" (default 7)
}

/**
 * Basic custom element card.
 */
@customElement(CARD_TYPE)
export class BakalariGradesAllCard extends LitElement {
  // YAML Editor
  static getConfigForm() {
    return {
      assertConfig: (config: any) => {
        if (!config?.entity) throw new Error("Název entity je vyžadován");
      }
    }
  }

  static async getConfigElement() {
    await import("./bakalari-grades-all/editor");
    return document.createElement("bakalari-grades-all-editor");
  }

  // Default config on card creation
  static getStubConfig(): any {
    return {
      entity: "sensor.bakalari_grades_all",
      name: "Bakaláři – Všechny známky",
      // viditelnost bloků
      show_subjects: true,
      show_recent: true,
      recent_on_top: false,
      // limit posledních známek
      limit_recent: 12,
      reflect_subjects_in_recent: false,
      // třídění a filtrování předmětů
      sort_subjects_by: "name",
      sort_subjects_dir: "asc",
      filter_subjects_min_count: 0,
      include_subject_sensors: [],
      exclude_subject_sensors: [],
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
    reflect_subjects_in_recent: false,
    show_subjects: true,
    show_recent: true,
    recent_on_top: false,
    sort_subjects_by: "name",
    sort_subjects_dir: "asc",
    filter_subjects_min_count: 0,
    include_subject_sensors: [],
    exclude_subject_sensors: [],
    limit_subjects: 0,
    // marks source and limits
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
  @state() private accessor _listOfSensorNames: string[] = [];

  static styles = styles;

  protected updated(changed: Map<string, unknown>) {
    const hassChanged = changed.has("hass");
    const configChanged = changed.has("_config");

    if ((hassChanged || configChanged) && this.hass && this._config) {
      let next = getSubjectsSensorNames(this.hass, this._config);
      const inc = this._config.include_subject_sensors || [];
      const exc = this._config.exclude_subject_sensors || [];
      if (inc.length) next = next.filter((s) => inc.includes(s));
      if (exc.length) next = next.filter((s) => !exc.includes(s));
      if (
        next.length !== this._listOfSensorNames.length ||
        next.some((s, i) => s !== this._listOfSensorNames[i])
      ) {
        this._listOfSensorNames = next;
      }
    }
  }

  setConfig(config: Config) {
    if (!config || !config.entity) {
      throw new Error("Chybí konfigurace: nastav 'entity'.");
    }
    this._config = {
      limit_recent: 12,
      reflect_subjects_in_recent: false,
      show_subjects: true,
      show_recent: true,
      sort_subjects_by: "name",
      sort_subjects_dir: "asc",
      filter_subjects_min_count: 0,
      include_subject_sensors: [],
      exclude_subject_sensors: [],
      limit_subjects: 0,
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
  }

  private _name(): string {
    return this._config.name || this._config.title || "Bakaláři – Všechny známky";
  }

  // private _gradeClass(txt?: string): string {
  //   return gradeClass(txt, this._config.show_colors !== false);
  // }

  private _fmtDate(iso?: string): string {
    const locale = this.hass?.locale?.language || undefined;
    return formatDateTime(iso, { locale });
  }

  // private _gradeNumber(txt?: string): number | null {
  //   return parseGradeNumber(txt);
  // }

  private _safeNum(n: any, digits = 3): string {
    return formatSafeNum(n, digits);
  }

  private _icon(attrs: AnyObj): string {
    return attrs?.icon || "mdi:book-education";
  }

  // ---------- Group & sort ----------

  /**
   * Update state of open subjects.
   * @param mutator
   */
  private _updateOpenSubjects(mutator: (subjects: Set<string>) => void) {
    const copy = new Set(this._openSubjects);
    mutator(copy);
    this._openSubjects = copy;
    if (this._config.persist_open_subjects !== false) {
      this._persist?.saveSet("open_subjects", this._openSubjects);
    }
  }
  /**
   * Toggle a subject's open state.
   * @param key
   * @param ev
   * @returns
   */
  private _toggleSubject(key: string, ev?: Event) {
    ev?.stopPropagation?.();
    if (!key) return;
    this._updateOpenSubjects((subjs) => (subjs.has(key) ? subjs.delete(key) : subjs.add(key)));
  }

  /**
   * Open all subjects
   */
  private _expandAll() {
    const list = getSubjectsSensorNames(this.hass, this._config);
    this._updateOpenSubjects((subjs) => {
      for (const subj of list) {
        subjs.add(subj);
      }
    });
  }

  /**
   * Close all subjects.
   */
  private _collapseAll() {
    this._updateOpenSubjects((subjs) => {
      subjs.clear();
    });
  }

  /**
   * Save Auto-expand option to save-state
   * @param e
   */
  private _onToggleAutoExpand(e: any) {
    const v = !!e?.target?.checked;
    this._autoExpandNew = v;
    this._persist?.saveBool("auto_expand_new", v);
    this._autoApplied = false; // re-apply on next render if turning on
  }

  /**
   * TODO: Fix auto expand
   * @param attrs
   * @returns
   */
  private _applyAutoExpand(attrs: AnyObj) {
    const days = Math.max(0, Number(this._config.auto_expand_days || 7));
    if (!days) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const grouped = groupMarksBySubject(attrs);
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

  /**
   * Render subject block
   * @returns
   */
  private _subjectsBlock() {
    if (!this._listOfSensorNames.length) {
      return html`<div class="empty">K předmětům nejsou data.</div>`;
    }

    const sortBy = this._config?.sort_subjects_by;
    const sortOrder = this._config?.sort_subjects_dir;

    const sortedList = sortSubjects(this.hass, this._listOfSensorNames, sortBy, sortOrder)
    return html`
      <div class="subjects">
        <h4>Předměty</h4>
        <div class="grid">
          ${repeat(sortedList, (s) => {
      const open = this._openSubjects.has(s?.sensor_name ?? "");
      return html`
              <bka-subject-card-new
                .subject=${s}
                .open=${open}
                .hass=${this.hass}
                .openKeys=${this._openSubjects}
                .showColors=${this._config.show_colors !== false}
                @toggle-subject=${(e: CustomEvent<{ key: string }>) =>
          this._toggleSubject(e.detail.key, e)}
              ></bka-subject-card-new>
            `;
    })}
        </div>
      </div>
    `;
  }

  /**
   * Render recent block
   * @param attrs
   * @returns
   */
  private _recentBlock() {
    const limit = Math.max(0, Number(this._config.limit_recent ?? 12)) || 0;
    const useSelected = !!this._config.reflect_subjects_in_recent;
    const sensors = useSelected ? this._listOfSensorNames : getSubjectsSensorNames(this.hass, this._config);
    const recent: RecentMark[] = getRecentMarks(this.hass, sensors, limit);
    if (!recent.length) {
      return html`<div class="empty">Žádné poslední známky.</div>`;
    }

    return html`
      <div class="recent">
        <h4>Poslední známky</h4>
        ${repeat(
      recent,
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

  /**
   * Render main card
   * @returns
   */
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

    const attrs: AnyObj = stateObj.attributes?.summary ?? {};
    const total = Number(attrs.total_marks ?? 0);
    const newCount = Number(attrs.new_count ?? 0);
    const numericCount = Number(attrs.total_non_point_marks ?? 0);
    const nonNumericCount = Number(attrs.total_point_marks ?? 0);
    const subjects_count = Number(attrs.subjects ?? 0);
    const avg = this._safeNum(attrs.avg, 3);
    const wavg = this._safeNum(attrs.wavg, 3);
    const icon = this._icon(attrs);

    if (this._autoExpandNew && !this._autoApplied) {
      this._applyAutoExpand(attrs);
    }

    const subjects = this._config.show_subjects !== false ? this._subjectsBlock() : null;
    const recent = this._config.show_recent !== false ? this._recentBlock() : null;

    const sort_blok = () =>
      this._config.recent_on_top
        ? html`${recent}${subjects}`
        : html`${subjects}${recent}`;


    return html`
      <ha-card .header=${name}>
        <div class="wrap">
          <div class="tools">
            <button class="btn" @click=${() => this._expandAll()}>Rozbalit vše</button>
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
              <span class="chip"
                ><span class="label">Předmětů</span><strong>${subjects_count}</strong></span
              >
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

          ${sort_blok()}
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
