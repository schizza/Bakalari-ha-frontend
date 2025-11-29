/**
 * Custom editor for Bakaláři – Všechny známky
 * -------------------------------------------
 * Umožní dynamicky vybrat předměty (senzory) ze seznamu získaného
 * z helper senzoru (attributes.sensor_map) a uložit výběr do konfigurace:
 *  - include_subject_sensors: string[] (zobrazit pouze vybrané)
 *  - exclude_subject_sensors: string[] (vynechat vybrané)
 */

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Config } from "../bakalari-grades-all";

type HAEntityState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};

@customElement("bakalari-grades-all-editor")
export class BakalariGradesAllEditor extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) public accessor hass: any;
  @state() private accessor _config: Config | undefined;
  @state() private accessor _search = "";
  @state() private accessor _searchExc = "";
  @state() private accessor _showDialog = false;

  setConfig(config: Config) {
    // Ulož konfiguraci a zajisti výchozí hodnoty polí, které můžeme měnit
    this._config = {
      ...config,
      include_subject_sensors: (config as any).include_subject_sensors || [],
      exclude_subject_sensors: (config as any).exclude_subject_sensors || [],
    };
  }

  private _emitConfigChanged() {
    if (!this._config) return;
    // Vyemituj změnu configu do Lovelace
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _entityState(entityId: string | undefined): HAEntityState | undefined {
    if (!entityId || !this.hass?.states) return undefined;
    return this.hass.states[entityId] as HAEntityState | undefined;
  }

  private _sensorMap(): Record<string, string> {
    const entity = this._config?.entity;
    const state = this._entityState(entity || "");
    const map = state?.attributes?.["sensor_map"];
    if (!map || typeof map !== "object") return {};
    return map as Record<string, string>;
  }

  /**
   * Vytvoří seznam položek k zobrazení: { id: sensor_entity_id, label: "Název (ABR)" }
   */
  private _subjectsList(): Array<{ id: string; label: string }> {
    const map = this._sensorMap();
    const byId: string[] = Object.values(map || {});
    const items: Array<{ id: string; label: string }> = [];

    for (const sensorName of byId) {
      const s = this._entityState(sensorName);
      const subj = s?.attributes?.subject || {};
      const title: string = String(subj.subject_name ?? "").trim();
      const abbr: string = String(subj.subject_abbr ?? "").trim();
      const label = title || abbr ? `${title || abbr}${title && abbr ? ` (${abbr})` : ""}` : sensorName;
      items.push({ id: sensorName, label });
    }

    // Seřadit podle labelu pro pohodlnější výběr
    items.sort((a, b) => a.label.localeCompare(b.label, "cs", { sensitivity: "base" }));
    return items;
  }

  private _isIncluded(id: string): boolean {
    const list = this._config?.include_subject_sensors || [];
    return list.includes(id);
  }

  private _isExcluded(id: string): boolean {
    const list = this._config?.exclude_subject_sensors || [];
    return list.includes(id);
  }

  private _toggleSelect(listKey: "include_subject_sensors" | "exclude_subject_sensors", id: string, checked: boolean) {
    if (!this._config) return;
    const curr = new Set(this._config[listKey] || []);
    if (checked) curr.add(id);
    else curr.delete(id);
    this._config = { ...(this._config as any), [listKey]: Array.from(curr) };
    this._emitConfigChanged();
  }

  private _selectAll(listKey: "include_subject_sensors" | "exclude_subject_sensors") {
    if (!this._config) return;
    const all = this._subjectsList().map((i) => i.id);
    this._config = { ...(this._config as any), [listKey]: all };
    this._emitConfigChanged();
  }

  private _clearAll(listKey: "include_subject_sensors" | "exclude_subject_sensors") {
    if (!this._config) return;
    this._config = { ...(this._config as any), [listKey]: [] };
    this._emitConfigChanged();
  }

  private _onSearch(e: Event) {
    const v = String((e.target as HTMLInputElement)?.value || "");
    this._search = v;
  }

  private _onSearchExc(e: Event) {
    const v = String((e.target as HTMLInputElement)?.value || "");
    this._searchExc = v;
  }

  private _onValueChanged(e: any) {
    if (!this._config) return;
    const value = e?.detail?.value;
    if (!value) return;
    this._config = { ...(this._config as any), ...value };
    this._emitConfigChanged();
  }

  private _openDialog = () => {
    this._showDialog = true;
  };

  private _closeDialog = () => {
    this._showDialog = false;
  };

  render() {
    if (!this._config) return nothing;

    // Schema
    const schema = [
      { name: "entity", selector: { entity: {} } },
      { name: "name", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_subjects", selector: { boolean: {} } },
          { name: "show_recent", selector: { boolean: {} } },
          { name: "recent_on_top", selector: { boolean: {} } },
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
          { name: "reflect_subjects_in_recent", selector: { boolean: {} } },
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
    ];

    const computeLabel = (schema: any) => {
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
        case "recent_on_top":
          return "Blok poslední známky nad Předměty";
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
        case "reflect_subjects_in_recent":
          return "Reflektovat výběr předmětů u posledních známek";
        case "auto_expand_new":
          return "Auto-rozbalit předměty s nepodepsanými známkami";
        case "auto_expand_days":
          return "Kolik dní zpět je 'nové'";
      }
      return undefined;
    };
    const entity = this._config.entity;

    const subjects = entity ? this._subjectsList() : [];
    const filteredInc = this._search
      ? subjects.filter((i) => i.label.toLowerCase().includes(this._search.toLowerCase()))
      : subjects;

    const filteredExc = this._searchExc
      ? subjects.filter((i) => i.label.toLowerCase().includes(this._searchExc.toLowerCase()))
      : subjects;

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${schema}
          .computeLabel=${computeLabel}
          @value-changed=${this._onValueChanged}
        ></ha-form>

        <div class="inline-actions">
          <button type="button" @click=${this._openDialog}>Vybrat předměty…</button>
          <div class="selected-summary">
            <div><strong>Vybrané:</strong>
              ${(() => {
        const inc = this._config?.include_subject_sensors || [];
        if (!inc.length) return "vše";
        return inc.map((id: string) => {
          const s = this._entityState(id);
          const ab = String(s?.attributes?.subject?.subject_abbr ?? "").trim();
          return ab || id;
        }).join(", ");
      })()}
            </div>
            <div><strong>Vynechané:</strong>
              ${(() => {
        const exc = this._config?.exclude_subject_sensors || [];
        if (!exc.length) return "Žádné";
        return exc.map((id: string) => {
          const s = this._entityState(id);
          const ab = String(s?.attributes?.subject?.subject_abbr ?? "").trim();
          return ab || id;
        }).join(", ");
      })()}
            </div>
          </div>
        </div>
      </div>

      ${this._showDialog ? html`
        <div class="overlay" @click=${this._closeDialog}>
          <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
            <h3>Výběr předmětů</h3>
            <p>Vyber konkrétní senzory předmětů, které se mají zobrazovat (include), nebo naopak skrýt (exclude).</p>

            <div class="columns">
              <div class="col">
                <h4>Zobrazit pouze vybrané</h4>
                <div class="toolbar">
                  <input type="text" placeholder="Hledat…" .value=${this._search} @input=${this._onSearch} />
                  <button type="button" @click=${() => this._selectAll("include_subject_sensors")}>Vybrat vše</button>
                  <button type="button" @click=${() => this._clearAll("include_subject_sensors")}>Zrušit vše</button>
                </div>
                <div class="list">
                  ${filteredInc.map(
        (it) => html`
                      <label class="row">
                        <input
                          type="checkbox"
                          .checked=${this._isIncluded(it.id)}
                          @change=${(e: Event) => this._toggleSelect("include_subject_sensors", it.id, (e.target as HTMLInputElement).checked)}
                        />
                        <span class="lbl" title=${it.id}>${it.label}</span>
                        <span class="sub">${it.id}</span>
                      </label>
                    `,
      )}
                </div>
              </div>

              <div class="col">
                <h4>Vynechat vybrané</h4>
                <div class="toolbar">
                  <input type="text" placeholder="Hledat…" .value=${this._searchExc} @input=${this._onSearchExc} />
                  <button type="button" @click=${() => this._selectAll("exclude_subject_sensors")}>Vybrat vše</button>
                  <button type="button" @click=${() => this._clearAll("exclude_subject_sensors")}>Zrušit vše</button>
                </div>
                <div class="list">
                  ${filteredExc.map(
        (it) => html`
                      <label class="row">
                        <input
                          type="checkbox"
                          .checked=${this._isExcluded(it.id)}
                          @change=${(e: Event) => this._toggleSelect("exclude_subject_sensors", it.id, (e.target as HTMLInputElement).checked)}
                        />
                        <span class="lbl" title=${it.id}>${it.label}</span>
                        <span class="sub">${it.id}</span>
                      </label>
                    `,
      )}
                </div>
              </div>
            </div>

            <div class="actions">
              <button type="button" @click=${this._closeDialog}>Hotovo</button>
            </div>
          </div>
        </div>
      ` : nothing}

      <style>
        .card-config { display: block; }
        .inline-actions { margin-top: 12px; }
        .selected-summary {
          margin-top: 6px;
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.4;
        }
        .selected-summary strong {
          color: var(--primary-text-color);
          font-weight: 600;
          margin-right: 4px;
        }
        h3 { margin: 0 0 8px; }
        h4 { margin: 12px 0 8px; }
        .columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .toolbar {
          display: flex;
          gap: 8px;
          align-items: center;
          margin: 6px 0 8px;
        }
        .toolbar input[type="text"] {
          flex: 1;
          padding: 6px 8px;
        }
        .list {
          display: grid;
          gap: 4px;
          max-height: 360px;
          overflow: auto;
          border: 1px solid var(--divider-color, #ddd);
          border-radius: 6px;
          padding: 8px;
          background: var(--card-background-color, #fff);
        }
        .row {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 4px 2px;
          cursor: pointer;
        }
        .row input[type="checkbox"] {
          margin: 0 6px 0 2px;
        }
        .lbl {
          font-weight: 500;
        }
        .sub {
          grid-column: 2 / span 1;
          color: var(--secondary-text-color);
          font-size: 12px;
          opacity: 0.9;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }
        button {
          padding: 6px 10px;
          cursor: pointer;
        }

        /* Dialog overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .dialog {
          width: min(960px, 92vw);
          max-height: 84vh;
          overflow: auto;
          background: var(--card-background-color, #fff);
          border-radius: 8px;
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.2));
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bakalari-grades-all-editor": BakalariGradesAllEditor;
  }
}
