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
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export const CARD_VERSION = "0.3.0";
export const CARD_TYPE = "bakalari-grades-all";
export const CARD_NAME = "Bakaláři – Všechny známky";

registerCard(
  CARD_TYPE,
  CARD_NAME,
  "Přehled všech známek: souhrn, předměty (s rozklikem) a poslední známky.",
);

type AnyObj = Record<string, any>;

interface SubjectSummary {
  subject_id?: string;
  subject_abbr?: string;
  subject_name?: string;
  count?: number;
  new_count?: number;
  numeric_count?: number;
  non_numeric_count?: number;
  last_text?: string;
  last_date?: string;
  avg?: number;
  wavg?: number;
}

interface RecentMark {
  id?: string | number;
  date?: string;
  subject_id?: string;
  subject_abbr?: string;
  subject_name?: string;
  caption?: string;
  theme?: string;
  mark_text?: string;
  is_new?: boolean;
  is_points?: boolean;
  points_text?: string;
  max_points?: number;
  teacher?: string | null;
}

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

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      overflow: hidden;
    }

    .wrap {
      padding: 12px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tools {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn:hover {
      background: color-mix(in oklab, var(--primary-color) 6%, var(--card-background-color));
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.95rem;
      color: var(--secondary-text-color);
      user-select: none;
      margin-left: auto;
    }

    /* Summary */
    .summary {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px 14px;
      align-items: center;
    }
    .icon {
      color: var(--secondary-text-color);
    }
    .summary-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 0.9rem;
      line-height: 1;
    }
    .chip .label {
      color: var(--secondary-text-color);
      font-size: 0.85rem;
    }
    .chip.attn {
      border-color: var(--accent-color);
      background: color-mix(in oklab, var(--accent-color) 14%, transparent);
    }

    /* Subjects grid */
    .subjects {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .subjects h4 {
      margin: 0;
      font-size: 1rem;
      color: var(--primary-text-color);
      font-weight: 600;
    }
    .grid {
      --min: 260px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(var(--min), 1fr));
      gap: 10px;
    }
    .subj {
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      border-radius: 12px;
      padding: 10px 12px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        "icon name meta"
        "last last last"
        "marks marks marks";
      column-gap: 10px;
      row-gap: 8px;
      align-items: center;
      min-width: 0;
      cursor: pointer;
      transition: background 120ms ease;
    }
    .subj:hover {
      background: color-mix(in oklab, var(--primary-color) 4%, var(--card-background-color));
    }
    .sicon {
      grid-area: icon;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: var(--primary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      letter-spacing: 0.4px;
    }
    .name {
      grid-area: name;
      min-width: 0;
    }
    .name .title {
      font-weight: 700;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name .sub {
      color: var(--secondary-text-color);
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      grid-area: meta;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .kpi {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      font-size: 0.85rem;
      line-height: 1;
    }
    .caret {
      margin-left: 8px;
      font-size: 0.95rem;
      color: var(--secondary-text-color);
    }
    .mark {
      font-weight: 800;
      min-width: 1.6em;
      text-align: center;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      color: var(--primary-text-color);
      letter-spacing: 0.3px;
    }
    .last {
      grid-area: last;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
    .last .caption {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      color: var(--secondary-text-color);
      background: var(--card-background-color);
    }
    .last .theme {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color);
    }
    .last .date {
      margin-left: auto;
    }
    .marks {
      grid-area: marks;
      display: none;
      border-top: 1px dashed var(--divider-color);
      padding-top: 8px;
    }
    .subj.open .marks {
      display: block;
    }
    .mlist {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mrow {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        "m mtitle mdate"
        "m mtheme mdate";
      gap: 4px 10px;
      align-items: center;
      padding: 4px 0;
      border-radius: 8px;
    }
    .mrow .m {
      grid-area: m;
      min-width: 40px;
      text-align: center;
    }
    .mrow .mtitle {
      grid-area: mtitle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      color: var(--primary-text-color);
    }
    .mrow .mtheme {
      grid-area: mtheme;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      gap: 6px;
      align-items: center;
      font-size: 0.92rem;
    }
    .mrow .mdate {
      grid-area: mdate;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
      text-align: right;
      white-space: nowrap;
      margin-left: 8px;
    }
    .badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      color: var(--secondary-text-color);
      background: var(--card-background-color);
    }

    /* Recent */
    .recent {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .recent h4 {
      margin: 0;
      font-size: 1rem;
      color: var(--primary-text-color);
      font-weight: 600;
    }
    .item {
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      border-radius: 12px;
      padding: 10px 12px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        "mark title date"
        "mark theme date";
      column-gap: 10px;
      row-gap: 4px;
      align-items: center;
      min-width: 0;
    }
    .item .mark {
      grid-area: mark;
      min-width: 44px;
      font-size: 1.1rem;
    }
    .item .title {
      grid-area: title;
      font-weight: 700;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item .theme {
      grid-area: theme;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .item .date {
      grid-area: date;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
      text-align: right;
      white-space: nowrap;
      margin-left: 8px;
    }
    .empty,
    .error {
      color: var(--secondary-text-color);
      font-size: 0.95rem;
    }
    .error {
      color: var(--error-color, #c62828);
    }
  `;

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
    if (this._config.persist_open_subjects !== false) {
      this._openSubjects = this._loadSet(this._storageKey("open_subjects"));
    } else {
      this._openSubjects.clear();
    }
    this._autoExpandNew = this._loadBool(
      this._storageKey("auto_expand_new"),
      !!this._config.auto_expand_new,
    );
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

  private _fmtDate(iso?: string): string {
    if (!iso) return "";
    const lang = this.hass?.locale?.language || "cs-CZ";
    try {
      return new Date(iso).toLocaleString(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      } as any);
    } catch {
      return String(iso);
    }
  }

  private _gradeNumber(txt?: string): number | null {
    if (!txt) return null;
    const s = String(txt).trim().replace(",", ".");
    const m = s.match(/^([1-5])(\.\d+)?$/);
    if (!m) return null;
    const n = parseFloat(s);
    if (Number.isFinite(n)) return n;
    return null;
  }

  private _markStyle(txt?: string): string {
    if (this._config.show_colors === false) return "";
    const n = this._gradeNumber(txt);
    const colors: Record<number, string> = {
      1: "#2e7d32",
      2: "#558b2f",
      3: "#f9a825",
      4: "#ef6c00",
      5: "#c62828",
    };
    if (n && n >= 1 && n <= 5) {
      const c = colors[Math.round(n as number)] || "#888";
      return `background: color-mix(in oklab, ${c} 20%, transparent); border-color: ${c}40;`;
    }
    return "";
  }

  private _abbr(s?: string): string {
    return (s ?? "").trim();
  }

  private _subjectTitle(s: SubjectSummary): string {
    return (s.subject_name || this._abbr(s.subject_abbr) || "Neznámý předmět").trim();
  }

  private _safeNum(n: any, digits = 3): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return v.toFixed(digits).replace(/\.?0+$/, (m) => (m.startsWith(".") ? m.slice(1) : ""));
  }

  private _icon(attrs: AnyObj): string {
    return attrs?.icon || "mdi:book-education";
  }

  // ---------- Persistence utils ----------
  private _storageKey(suffix: string) {
    const ent = (this._config?.entity || "unknown").replace(/\W+/g, "_");
    return `bakalari_grades_all_${ent}_${suffix}`;
  }
  private _loadSet(key: string): Set<string> {
    try {
      const v = localStorage.getItem(key);
      if (!v) return new Set();
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return new Set(arr.map((s) => String(s)));
      return new Set();
    } catch {
      return new Set();
    }
  }
  private _saveSet(key: string, set: Set<string>) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
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

  // ---------- Group & sort ----------
  private _normId(id?: string): string {
    return (id ?? "").trim();
  }
  private _subjectKeyFromSummary(s: SubjectSummary): string {
    return (
      this._normId(s.subject_id as any) ||
      this._abbr(s.subject_abbr) ||
      (s.subject_name || "").trim()
    );
  }
  private _subjectKeyFromMark(m: RecentMark): string {
    return (
      this._normId(m.subject_id as any) ||
      this._abbr(m.subject_abbr) ||
      (m.subject_name || "").trim()
    );
  }

  private _groupMarks(attrs: AnyObj): Map<string, RecentMark[]> {
    const map = new Map<string, RecentMark[]>();
    // resolve source attribute for ALL marks
    const pref = (this._config.marks_attribute || "recent").trim();
    let src: any = attrs?.[pref];
    if (!Array.isArray(src)) {
      // fallbacks
      src = Array.isArray(attrs?.all)
        ? attrs.all
        : Array.isArray(attrs?.marks)
          ? attrs.marks
          : Array.isArray(attrs?.recent)
            ? attrs.recent
            : [];
    }
    const rec: RecentMark[] = src as RecentMark[];
    for (const m of rec) {
      const k = this._subjectKeyFromMark(m);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(m);
      map.set(k, arr);
    }
    // sort each subject's marks desc by date
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const at = new Date(a.date || 0).getTime();
        const bt = new Date(b.date || 0).getTime();
        return bt - at;
      });
      map.set(k, arr);
    }
    return map;
  }

  private _filteredSortedSubjects(attrs: AnyObj): SubjectSummary[] {
    let list: SubjectSummary[] = Array.isArray(attrs?.by_subject) ? attrs.by_subject.slice() : [];
    if (!list.length) return [];

    const minCount = Math.max(0, Number(this._config.filter_subjects_min_count || 0));
    const include = (this._config.include_subject_ids || []).map((s) => this._normId(String(s)));
    const exclude = (this._config.exclude_subject_ids || []).map((s) => this._normId(String(s)));

    list = list.filter((s) => {
      const key = this._subjectKeyFromSummary(s);
      if (!key) return false;
      if (include.length && !include.includes(this._normId(String(s.subject_id || key))))
        return false;
      if (exclude.length && exclude.includes(this._normId(String(s.subject_id || key))))
        return false;
      if (Number(s.count || 0) < minCount) return false;
      return true;
    });

    const by = (this._config.sort_subjects_by || "name").toLowerCase();
    const dir = (this._config.sort_subjects_dir || "asc").toLowerCase();
    const asc = dir === "asc";

    const byVal = (s: SubjectSummary): any => {
      switch (by) {
        case "abbr":
          return this._abbr(s.subject_abbr);
        case "count":
          return Number(s.count || 0);
        case "avg":
          return Number(s.avg ?? Number.POSITIVE_INFINITY);
        case "wavg":
          return Number(s.wavg ?? Number.POSITIVE_INFINITY);
        case "last_date":
          return new Date(s.last_date || 0).getTime();
        case "name":
        default:
          return this._subjectTitle(s).toLowerCase();
      }
    };

    list.sort((a, b) => {
      const av = byVal(a);
      const bv = byVal(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (!asc) list.reverse();

    const lim = Math.max(0, Number(this._config.limit_subjects || 0));
    if (lim > 0) list = list.slice(0, lim);

    return list;
  }

  private _toggleSubject(key: string, ev?: Event) {
    ev?.stopPropagation?.();
    if (!key) return;
    if (this._openSubjects.has(key)) this._openSubjects.delete(key);
    else this._openSubjects.add(key);
    if (this._config.persist_open_subjects !== false) {
      this._saveSet(this._storageKey("open_subjects"), this._openSubjects);
    }
    this.requestUpdate();
  }

  private _expandAll(attrs: AnyObj) {
    const list = this._filteredSortedSubjects(attrs);
    for (const s of list) {
      const key = this._subjectKeyFromSummary(s);
      if (key) this._openSubjects.add(key);
    }
    if (this._config.persist_open_subjects !== false) {
      this._saveSet(this._storageKey("open_subjects"), this._openSubjects);
    }
    this.requestUpdate();
  }
  private _collapseAll() {
    this._openSubjects.clear();
    if (this._config.persist_open_subjects !== false) {
      this._saveSet(this._storageKey("open_subjects"), this._openSubjects);
    }
    this.requestUpdate();
  }
  private _onToggleAutoExpand(e: any) {
    const v = !!e?.target?.checked;
    this._autoExpandNew = v;
    this._saveBool(this._storageKey("auto_expand_new"), v);
    this._autoApplied = false; // re-apply on next render if turning on
    this.requestUpdate();
  }
  private _applyAutoExpand(attrs: AnyObj) {
    const days = Math.max(0, Number(this._config.auto_expand_days || 7));
    if (!days) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const grouped = this._groupMarks(attrs);
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
      this._saveSet(this._storageKey("open_subjects"), this._openSubjects);
    }
    this._autoApplied = true;
  }
  private _subjectsBlock(attrs: AnyObj) {
    const list: SubjectSummary[] = this._filteredSortedSubjects(attrs);
    if (!list.length) {
      return html`<div class="empty">K předmětům nejsou data.</div>`;
    }
    const grouped = this._groupMarks(attrs);

    return html`
      <div class="subjects">
        <h4>Předměty</h4>
        <div class="grid">
          ${list.map((s) => {
            const key = this._subjectKeyFromSummary(s);
            const open = this._openSubjects.has(key);
            const abbr = this._abbr(s.subject_abbr || "");
            const title = this._subjectTitle(s);
            const count = Number(s.count || 0);
            const avg = this._safeNum(s.avg, 3);
            const wavg = this._safeNum(s.wavg, 3);
            const lastText = s.last_text ? String(s.last_text) : "";
            const lastDate = this._fmtDate(s.last_date || "");

            const marks = grouped.get(key) || [];
            const sLimit = Math.max(0, Number(this._config.limit_subject_marks || 0));
            const mlist = sLimit > 0 ? marks.slice(0, sLimit) : marks;

            return html`
              <div
                class="subj ${open ? "open" : ""}"
                title=${title}
                @click=${(e: Event) => this._toggleSubject(key, e)}
              >
                <div class="sicon" aria-hidden="true">${abbr || "?"}</div>
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
                    <span class="pill"
                      ><span class="label">Počet</span> <strong>${count}</strong></span
                    >
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
                  <span class="mark" style=${this._markStyle(lastText)}>${lastText || "—"}</span>
                  <span class="theme"></span>
                  <span class="date">${lastDate}</span>
                </div>

                <div class="marks" @click=${(e: Event) => e.stopPropagation()}>
                  ${mlist.length
                    ? html`
                        <div class="mlist">
                          ${mlist.map((m) => {
                            const mMark = (m.mark_text || "").trim();
                            const mDate = this._fmtDate(m.date);
                            const mTheme = (m.theme || "").trim();
                            const mCaption = (m.caption || "").trim();
                            return html`
                              <div class="mrow">
                                <div class="m mark" style=${this._markStyle(mMark)}>
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
                          })}
                        </div>
                      `
                    : html`<div class="empty">
                        K tomuto předmětu nejsou dostupné jednotlivé známky (chybí v atributu
                        "recent").
                      </div>`}
                </div>
              </div>
            `;
          })}
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
        ${list.map((m) => {
          const subj = (m.subject_name || this._abbr(m.subject_abbr) || "Neznámý předmět").trim();
          const theme = (m.theme || "").trim();
          const caption = (m.caption || "").trim();
          const mark = (m.mark_text || "").trim();
          const date = this._fmtDate(m.date);
          return html`
            <div class="item">
              <div class="mark" style=${this._markStyle(mark)}>${mark || "—"}</div>
              <div class="title">${subj}</div>
              <div class="date">${date}</div>
              <div class="theme">
                ${caption ? html`<span class="badge" title="Typ">${caption}</span>` : null}
                <span class="t">${theme || "—"}</span>
              </div>
            </div>
          `;
        })}
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
