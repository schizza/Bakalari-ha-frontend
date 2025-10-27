/*
  Bakaláři Timetable Card Plus
  -----------------------------------------------------------------
  Usage in Lovelace:
  - type: custom:bakalari-timetable-card-plus
    entity: sensor.bakalari_timetable
    title: Rozvrh
    show_weekends: false
    compact: false

    short: false
    slot_min_width: 55
    day_col_width: 66
    hide_empty: true
    clubs_enabled: true
    clubs_entity: sensor.my_clubs
    clubs_attribute: clubs
*/

import { registerCard } from "./bakalari-base";

export const CARD_VERSION = "0.0.1";
export const CARD_TYPE = "bakalari-timetable-card-plus";
export const CARD_NAME = "Bakaláři Rozvrh Plus (test)";

registerCard(CARD_TYPE, CARD_NAME, "Bakaláři - Školní rozvrh + kroužky");

// ---- Types ----
interface Slot {
  start: string;
  end: string;
}
interface CalendarEvent {
  start: string;
  end: string;
  summary?: string;
  description?: string;
  location?: string;
  kind?: "school" | "club";
}
interface Config {
  type?: string;
  entity: string;
  week_offset?: number;
  show_weekends?: boolean;
  compact?: boolean;
  title?: string;
  day_col_width?: number;
  slot_min_width?: number;
  fit?: "scroll" | "shrink";
  short?: boolean;
  hide_empty?: boolean;
  clubs_entity?: string;
  clubs_attribute?: string;
  clubs_enabled?: boolean;
}
interface HomeAssistantLike {
  states: Record<string, any>;
}

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat
const DAY_LABELS_CS = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
const DAY_LABELS_CS_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

// ---- Component ----
class BakalariTimetableCard extends HTMLElement {
  private _hass!: HomeAssistantLike;
  private _config!: Config;
  private _weekStart!: Date; // Monday 00:00 of selected week
  private _events: CalendarEvent[] = [];
  private _slots: Slot[] = [];
  private _root: ShadowRoot;
  private _error: string | null = null;
  private _clubEvents: CalendarEvent[] = [];

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }

  setConfig(config: Config) {
    if (!config?.entity)
      throw new Error("Nastav 'entity' na Bakaláři entitu, která má atribut 'timetable'.");
    this._config = {
      week_offset: 0,
      show_weekends: false,
      compact: false,
      short: false,
      ...config,
      type: `custom:${CARD_TYPE}`,
    };
    this._computeWeekStart();
    this._rebuildFromAttributes();
    this._render();
  }

  set hass(hass: HomeAssistantLike) {
    this._hass = hass;
    if (!this._weekStart) this._computeWeekStart();
    this._rebuildFromAttributes();
    this._render();
  }

  // getCardSize() {
  //   return 6;
  // }

  public getGridOptions() {
    return {
      rows: 12,
      columns: 24,
      min_rows: 2,
      min_columns: 24,
      min_width: 12,
      min_height: 12,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "label", selector: { label: {} } },
        { name: "entity", required: true, selector: { entity: {} } },
        { name: "title", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "compact", selector: { boolean: {} } },
            { name: "show_weekends", selector: { boolean: {} } },
            { name: "short", selector: { boolean: {} } },
            { name: "fit", selector: { select: { options: ["scroll", "shrink"] } } },
            { name: "hide_empty", selector: { boolean: {} } },
          ],
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "slot_min_width", selector: { number: {} } },
            { name: "day_col_width", selector: { number: {} } },
          ],
        },
      ],
      computeLabel: (schema: any) => {
        switch (schema.name) {
          case "show_weekends":
            return "Zobrazovat víkendy";
          case "compact":
            return "Kompaktní zobrazení";
          case "short":
            return "Krátké dny v týdnu";
          case "fit":
            return "Zobrazovat posuvník";
          case "hide_empty":
            return "Schovat prázdé hodiny";
        }
        return undefined;
      },
      computeHelper: (schema: any) => {
        switch (schema.name) {
          case "entity":
            return "This text describes the function of the entity selector";
          case "unit":
            return "The unit of measurement for this card";
        }
        return undefined;
      },
      assertConfig: (config: Config) => {
        if (!config.entity) {
          throw new Error("název entity je vyžadováným parametrem");
        }
      },
    };
  }

  static getStubConfig(): Config {
    return {
      entity: "sensor.bakalari_timetable",
      show_weekends: false,
      compact: true,
      short: false,
      slot_min_width: 55,
      day_col_width: 66,
      hide_empty: true,
    };
  }

  // ---- Core logic ----
  private _computeWeekStart() {
    const base = new Date();
    const d = base.getDay(); // 0..6
    const toMonday = d === 0 ? -6 : 1 - d;
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() + toMonday + (this._config?.week_offset || 0) * 7);
    this._weekStart = monday;
  }
  private _weekEnd(): Date {
    const e = new Date(this._weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }
  private _hm(d: Date) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  private _dayOfWeek(d: Date): DayIndex {
    return d.getDay() as DayIndex;
  }

  private _buildClubsFromAttributes(raw: any) {
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        this._clubEvents = [];
        return;
      }
    }
    if (!raw || typeof raw !== "object") {
      this._clubEvents = [];
      return;
    }
    const weekStartDate = new Date(this._weekStart); // Monday 00:00 of selected week
    const weekStart = weekStartDate.getTime();
    const weekEnd = this._weekEnd().getTime();

    // Akceptovat různé názvy klíčů: time_spans, time-spans, time-span, timeSpans, timeSpan
    let spansArr: Array<{ id: number; start: string; end: string; day?: number | string }> =
      (Array.isArray((raw as any).time_spans) && (raw as any).time_spans) ||
      (Array.isArray((raw as any)["time-spans"]) && (raw as any)["time-spans"]) ||
      (Array.isArray((raw as any)["time-span"]) && (raw as any)["time-span"]) ||
      (Array.isArray((raw as any).timeSpans) && (raw as any).timeSpans) ||
      (Array.isArray((raw as any).timeSpan) && (raw as any).timeSpan) ||
      [];
    if (!Array.isArray(spansArr)) spansArr = [];

    // Classes pole zůstává stejné, ale vazba může být 'time_id' i 'time-id' a pole může být 'classes' nebo 'class'
    let classesArr: Array<{ time_id?: number; ["time-id"]?: number; name: string }> =
      (Array.isArray((raw as any).classes) && (raw as any).classes) ||
      (Array.isArray((raw as any)["classes"]) && (raw as any)["classes"]) ||
      (Array.isArray((raw as any).class) && (raw as any).class) ||
      (Array.isArray((raw as any)["class"]) && (raw as any)["class"]) ||
      [];
    if (!Array.isArray(classesArr)) classesArr = [];

    const spanById = new Map<number, { start: string; end: string; day?: number }>();
    for (const s of spansArr) {
      const idOk = typeof (s as any)?.id === "number";
      const start = (s as any)?.start;
      const end = (s as any)?.end;
      const dayRaw = (s as any)?.day;
      const dayNum =
        typeof dayRaw === "number"
          ? dayRaw
          : typeof dayRaw === "string" && dayRaw.trim() !== ""
            ? Number(dayRaw)
            : undefined;

      if (idOk && start && end) {
        spanById.set((s as any).id, {
          start: String(start),
          end: String(end),
          day: typeof dayNum === "number" && !Number.isNaN(dayNum) ? dayNum : undefined,
        });
      }
    }

    const hm = (s: string) => /^\d{1,2}:\d{2}$/.test(s);
    const toISO = (timeStr: string, day?: number): string => {
      // Pokud je čas ve tvaru HH:MM a máme 'day', mapujeme na aktuální týden
      if (hm(timeStr) && typeof day === "number" && day >= 0 && day <= 6) {
        const base = new Date(weekStartDate);
        // JS 0..6 (Sun..Sat), náš weekStart je pondělí => posun:
        // day=1 => +0, day=2 => +1, ..., day=0 (neděle) => +6
        const offset = day === 0 ? 6 : day - 1;
        base.setDate(base.getDate() + offset);
        const [hh, mm] = timeStr.split(":").map((x) => Number(x));
        base.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
        return base.toISOString();
      }
      // Jinak se pokusíme parsovat jako libovolný datum/čas
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) return d.toISOString();
      return "";
    };

    const events: CalendarEvent[] = [];
    for (const c of classesArr) {
      const timeId = (c as any).time_id ?? (c as any)["time-id"];
      if (typeof timeId !== "number") continue;

      const sp = spanById.get(timeId);
      if (!sp) continue;

      const startISO = toISO(sp.start, sp.day);
      const endISO = toISO(sp.end, sp.day);
      if (!startISO || !endISO) continue;

      const ts = new Date(startISO).getTime();
      const te = new Date(endISO).getTime();
      if (isNaN(ts) || isNaN(te)) continue;

      // zahrneme jen kroužky, které spadají do aktuálně zvoleného týdne
      const overlaps =
        (ts >= weekStart && ts < weekEnd) ||
        (te > weekStart && te <= weekEnd) ||
        (ts <= weekStart && te >= weekEnd);
      if (!overlaps) continue;

      events.push({
        start: startISO,
        end: endISO,
        summary: ((c as any).name || "").trim(),
        description: "Kroužek",
        location: "",
        kind: "club",
      });
    }

    // setřídíme a uložíme
    events.sort((a, b) => a.start.localeCompare(b.start));
    this._clubEvents = events;
  }

  private _rebuildFromAttributes() {
    this._error = null;
    const st = this._hass?.states?.[this._config?.entity || ""];
    const attrs: any = st?.attributes || {};
    const timetable = attrs.timetable || attrs.Timetable;

    if (!timetable) {
      this._events = [];
      this._slots = [];
      this._error =
        "Chybí atribut 'timetable' na dané entitě. Ujisti se, že používáš správnou Bakaláři entitu.";
      return;
    }

    try {
      this._buildFromAttributes(timetable);
      const schoolEvents = this._events;

      this._clubEvents = [];
      if (this._config?.clubs_enabled) {
        const clubState = this._config?.clubs_entity
          ? this._hass?.states?.[this._config.clubs_entity]
          : st; // fallback: stejná entita
        const clubAttrs: any = clubState?.attributes || {};
        const clubAttrName = this._config?.clubs_attribute || "clubs";
        const clubsRaw =
          clubAttrs[clubAttrName] ??
          (Array.isArray(clubAttrs["time-span"]) ||
          Array.isArray(clubAttrs["time-spans"]) ||
          Array.isArray(clubAttrs.time_spans) ||
          Array.isArray(clubAttrs.timeSpans) ||
          Array.isArray(clubAttrs.timeSpan) ||
          Array.isArray(clubAttrs.classes)
            ? {
                time_spans:
                  clubAttrs.time_spans ??
                  clubAttrs["time-spans"] ??
                  clubAttrs["time-span"] ??
                  clubAttrs.timeSpans ??
                  clubAttrs.timeSpan,
                classes: clubAttrs.classes,
              }
            : undefined);
        this._buildClubsFromAttributes(clubsRaw);
      }

      this._events = [...schoolEvents, ...this._clubEvents].sort((a, b) =>
        a.start.localeCompare(b.start),
      );
    } catch (e: any) {
      this._events = [];
      this._slots = [];
      this._clubEvents = [];
      this._error = `Parse 'timetable' selhal: ${e?.message || e}`;
    }
  }

  private _buildFromAttributes(data: any) {
    const weekStart = this._weekStart.getTime();
    const weekEnd = this._weekEnd().getTime();

    // Normalize: attribute can be a single week object or a list of weeks (e.g. in data or data.weeks)
    const rawWeeks: any[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.weeks)
        ? (data as any).weeks
        : [data || {}];

    // Prefer week(s) that overlap currently selected week; if none overlap, fallback to all
    const overlapsSelected = (week: any) => {
      const ds: any[] = Array.isArray(week?.days) ? week.days : [];
      for (const d of ds) {
        const dateStr: string = d?.date || d?.day || d?.datetime || "";
        if (!dateStr) continue;
        const t = new Date(dateStr).getTime();
        if (!isNaN(t) && t >= weekStart && t < weekEnd) return true;
      }
      return false;
    };
    const selectedWeeks = rawWeeks.filter(overlapsSelected);
    const weeksToUse = selectedWeeks.length > 0 ? selectedWeeks : rawWeeks;

    // Merge hours/subjects/teachers/rooms and collect all days
    const hoursMap: Record<string, any> = {};
    const subjects: Record<string, any> = {};
    const teachers: Record<string, any> = {};
    const rooms: Record<string, any> = {};
    const days: any[] = [];
    for (const w of weeksToUse) {
      Object.assign(hoursMap, w?.hours || {});
      Object.assign(subjects, w?.subjects || {});
      Object.assign(teachers, w?.teachers || {});
      Object.assign(rooms, w?.rooms || {});
      if (Array.isArray(w?.days)) days.push(...w.days);
    }

    const normHM = (s: string) => {
      const [h, m] = String(s)
        .split(":")
        .map((x) => x.trim());
      return `${String(Number(h) || 0).padStart(2, "0")}:${String(Number(m) || 0).padStart(2, "0")}`;
    };

    // Build slots from hours (sorted by begin_time)
    const slots: Slot[] = Object.values(hoursMap)
      .map((h: any) => ({ start: normHM(h.begin_time), end: normHM(h.end_time) }))
      .sort((a: Slot, b: Slot) => a.start.localeCompare(b.start));

    // Map hour id -> slot key
    const slotKey = (s: string, e: string) => `${s}-${e}`;
    const hourIdToKey: Record<string, string> = {};
    for (const [id, h] of Object.entries(hoursMap)) {
      const s = normHM((h as any).begin_time);
      const e = normHM((h as any).end_time);
      hourIdToKey[String((h as any).id ?? id).trim()] = slotKey(s, e);
    }

    const events: CalendarEvent[] = [];
    for (const d of days) {
      const dateStr: string = d.date || d.day || d.datetime || ""; // e.g. 2025-10-22T00:00:00+02:00
      if (!dateStr) continue;
      const base = new Date(dateStr);
      const ts = base.getTime();
      if (isNaN(ts) || ts < weekStart || ts >= weekEnd) continue; // only current selected week

      // Holiday/Celebration: create per-slot placeholders
      const dayType = String(d.day_type || d.dayType || "").toLowerCase();
      const isHoliday = dayType === "holiday" || dayType === "holidays";
      const isCelebration = dayType === "celebration";
      if (isHoliday || isCelebration) {
        const label = isHoliday ? "Prázdniny" : "Svátek";
        const dayDesc = (d.description || "").trim();
        for (const sl of slots) {
          const s = new Date(base);
          const [sh, sm] = sl.start.split(":").map(Number);
          s.setHours(sh, sm, 0, 0);
          const e = new Date(base);
          const [eh, em] = sl.end.split(":").map(Number);
          e.setHours(eh, em, 0, 0);
          events.push({
            start: s.toISOString(),
            end: e.toISOString(),
            summary: label,
            description: dayDesc,
            location: "",
          });
        }
        continue;
      }
      const atoms: any[] = d.atoms || [];
      for (const a of atoms) {
        const hourId = String(a.hour_id ?? "").trim();
        const key = hourIdToKey[hourId];
        if (!key) continue; // unknown hour

        const [sHM, eHM] = key.split("-");
        const s = new Date(base);
        const [sh, sm] = sHM.split(":").map(Number);
        s.setHours(sh, sm, 0, 0);
        const e = new Date(base);
        const [eh, em] = eHM.split(":").map(Number);
        e.setHours(eh, em, 0, 0);

        const subjId = a.subject_id != null ? String(a.subject_id).trim() : null;
        const subj = subjId ? subjects[subjId] : null;
        const teacher = a.teacher_id ? teachers[String(a.teacher_id).trim()] : null;
        const room = a.room_id ? rooms[String(a.room_id).trim()] : null;

        let summary = (subj?.abbrev || subj?.name || "").trim();
        if (!summary && a.change)
          summary = (
            a.change?.type_name ||
            a.change?.type_abbrev ||
            a.change?.description ||
            "Změna"
          ).trim();

        const descParts = [
          subj?.name ? `Předmět: ${subj.name}` : "",
          teacher?.abbrev ? `Učitel: ${teacher.abbrev}` : "",
          a.theme ? `Téma: ${a.theme}` : "",
        ].filter(Boolean);

        events.push({
          start: s.toISOString(),
          end: e.toISOString(),
          summary,
          description: descParts.join("; "),
          location: (room?.abbrev || room?.name || "").trim(),
        });
      }
    }

    // Deduplicate identical events across merged weeks
    const seen = new Set<string>();
    const uniqueEvents = events.filter((ev) => {
      const key = `${ev.start}|${ev.end}|${(ev.summary || "").trim()}|${(ev.location || "").trim()}|${(ev.description || "").trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this._events = uniqueEvents.sort((a, b) => a.start.localeCompare(b.start));
    this._slots = slots;
  }

  // ---- UI helpers ----
  private _daysToRender(): DayIndex[] {
    const base: DayIndex[] = [1, 2, 3, 4, 5];
    if (this._config?.show_weekends) {
      base.unshift(0 as DayIndex);
      base.push(6 as DayIndex);
    }
    return base;
  }
  private _eventsByDay(): Record<DayIndex, CalendarEvent[]> {
    const m: Record<string, CalendarEvent[]> = {};
    for (const ev of this._events) {
      const di = this._dayOfWeek(new Date(ev.start));
      (m[di] ||= []).push(ev);
    }
    for (const k of Object.keys(m)) m[k]!.sort((a, b) => a.start.localeCompare(b.start));
    return m as Record<DayIndex, CalendarEvent[]>;
  }
  private _eventsAt(day: DayIndex, slot: Slot): CalendarEvent[] {
    const list = this._eventsByDay()[day] || [];
    const hm = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const sHM = slot.start;
    const eHM = slot.end;

    return list.filter((ev) => {
      const evS = hm(new Date(ev.start));
      const evE = hm(new Date(ev.end));
      // přesná shoda nebo událost leží uvnitř slotu
      const exact = evS === sHM && evE === eHM;
      const inside = evS >= sHM && evE <= eHM;
      return exact || inside;
    });
  }

  private _formatSlotLabel(slot: Slot, i: number) {
    return `${i + 1}. (${slot.start}–${slot.end})`;
  }
  private _formatTitle(ev?: CalendarEvent) {
    const anyEv: any = ev || {};
    return (anyEv.summary || anyEv.title || anyEv.message || anyEv.name || "").trim();
  }
  private _tooltip(ev: CalendarEvent) {
    return [
      this._formatTitle(ev),
      ev.location ? `Místnost: ${ev.location}` : "",
      ev.description || "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  private _weekLabel(): string {
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
    const s = new Date(this._weekStart);
    const e = new Date(this._weekEnd());
    e.setDate(e.getDate() - 1);
    return `${fmt(s)} – ${fmt(e)}`;
  }
  private _navigate(delta: number) {
    const d = new Date(this._weekStart);
    d.setDate(d.getDate() + delta * 7);
    this._weekStart = d;
    this._rebuildFromAttributes();
    this._render();
  }

  private _dayWidth(): number {
    if (typeof this._config?.day_col_width === "number") return this._config.day_col_width;
    return this._config?.compact ? 140 : 220;
  }
  private _slotMin(): number {
    if (typeof this._config?.slot_min_width === "number") return this._config.slot_min_width;
    return this._config?.compact ? 90 : 160;
  }
  private _escape(s: string) {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return s.replace(/[&<>"']/g, (c) => map[c]);
  }

  // ---- Render ----
  private _render() {
    const cfg = this._config;
    if (!cfg) return;

    let allSlots = [...this._slots];
    // Augment slots with club-only times that don't fit into any existing slot
    const clubEvents = this._events.filter((ev) => ev.kind === "club");
    if (clubEvents.length) {
      const hm = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const covers = (slot: Slot, s: string, e: string) => slot.start <= s && slot.end >= e;
      const existsOrCovered = (s: string, e: string) =>
        allSlots.some((sl) => (sl.start === s && sl.end === e) || covers(sl, s, e));
      for (const ev of clubEvents) {
        const sHM = hm(new Date(ev.start));
        const eHM = hm(new Date(ev.end));
        if (!existsOrCovered(sHM, eHM)) {
          allSlots.push({ start: sHM, end: eHM });
        }
      }
      allSlots.sort((a, b) => a.start.localeCompare(b.start));
    }
    const days = this._daysToRender();

    let cols = allSlots;
    if (this._config.hide_empty && allSlots.length) {
      const eventsByDay = this._eventsByDay();
      const slotHasEvent = (slot: Slot) =>
        days.some((day) => {
          const list = eventsByDay[day] || [];
          const hm = (d: Date) =>
            `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          return list.some((ev) => {
            const evS = hm(new Date(ev.start));
            const evE = hm(new Date(ev.end));
            return (
              (evS === slot.start && evE === slot.end) || (evS >= slot.start && evE <= slot.end)
            );
          });
        });
      cols = allSlots.filter(slotHasEvent);
    }

    const styles = `
      :host { display:block; }
      ha-card { overflow:hidden; }
      .card-header { display:flex; align-items:center; gap:12px; padding:12px 16px; }
      .title { font-weight:600; }
      .spacer { flex:1; }
      .week-nav { display:flex; align-items:center; gap:8px; font-weight:500; }
      .icon-btn { border:none; background:transparent; cursor:pointer; padding:4px; border-radius:8px; }
      .icon-btn:hover { background: var(--secondary-background-color); }
      .week-label { min-width:120px; text-align:center; }

      .scroller { overflow-x: auto; overflow-y: hidden; }
      .table { display:grid; grid-auto-rows:minmax(44px, auto); min-width: max(100%, calc(var(--day-col-width, 220px) + var(--col-count, 6) * var(--slot-min, 160px))); }
      .thead, .tr { display:grid; grid-template-columns: var(--day-col-width, 220px) repeat(var(--col-count, 6), minmax(var(--slot-min, 160px), 1fr)); }
      .thead { position:sticky; top:0; background: var(--card-background-color); z-index:1; }

      .th, .td { padding:10px 12px; border-bottom:1px solid var(--divider-color); }
      .th.slot { text-align:center; font-weight:600; }
      .th.day { font-weight:700; }
      .td.day { font-weight:600; background: var(--table-header-background-color, transparent); }
      .td.cell { text-align:center; }
      .subject { font-weight:600; }
      .empty { opacity:.5; }
      .compact .th, .compact .td { padding:6px 8px; }
      .error { color: var(--error-color, #c62828); padding: 0 16px 12px; }
      .ev {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 8px;
        margin: 2px 0;
      }
      .ev.school {
        background: var(--chip-background-color, rgba(125, 125, 125, 0.12));
        font-weight: 600;
      }
      .ev.club {
        background: var(--primary-color, #3f51b5);
        color: white;
        font-weight: 600;
      }
      .compact .ev { padding: 4px 6px; }
    `;

    const header = `
      <div class="card-header">
        <div class="title">${this._escape(cfg.title || "Rozvrh")}</div>
        <div class="spacer"></div>
        <div class="week-nav">
          <button class="icon-btn" id="prev" title="Předchozí týden"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
          <div class="week-label">${this._escape(this._weekLabel())}</div>
          <button class="icon-btn" id="next" title="Další týden"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        </div>
      </div>`;

    const thead = `
      <div class="thead">
        <div class="th day">Den / Hodina</div>
        ${cols.length ? cols.map((s, i) => `<div class="th slot">${this._escape(this._formatSlotLabel(s, i))}</div>`).join("") : `<div class="th slot" style="grid-column: span 6; opacity:.6; text-align:center;">Žádné sloty</div>`}
      </div>`;

    const tbody = days
      .map(
        (day) => `
      <div class="tr">
        <div class="td day">${this._config?.short ? DAY_LABELS_CS_SHORT[day] : DAY_LABELS_CS[day]}</div>
        ${cols
          .map((slot) => {
            const evs = this._eventsAt(day, slot);
            if (!evs.length) {
              return `<div class="td cell"><div class="empty">–</div></div>`;
            }
            const items = evs
              .map((ev) => {
                const title = this._escape(this._formatTitle(ev) || "—");
                const tip = this._escape(this._tooltip(ev));
                const cls = ev.kind === "club" ? "ev club" : "ev school";
                return `<div class="${cls}" title="${tip}"><span class="subject">${title}</span></div>`;
              })
              .join("");
            return `<div class="td cell">${items}</div>`;
          })
          .join("")}
      </div>
    `,
      )
      .join("");

    const errorBlock = this._error ? `<div class="error">${this._escape(this._error)}</div>` : "";

    this._root.innerHTML = `
      <ha-card class="${cfg.compact ? "compact" : ""}">
        <style>${styles}</style>
        ${header}
        ${errorBlock}
        <div class="scroller">
          <div class="table" style="--col-count:${cols.length}; --day-col-width:${this._dayWidth()}px; --slot-min:${this._slotMin()}px">
            ${thead}
            <div class="tbody">${tbody}</div>
          </div>
        </div>
      </ha-card>
    `;

    // Bind events
    this._root.getElementById("prev")?.addEventListener("click", () => this._navigate(-1));
    this._root.getElementById("next")?.addEventListener("click", () => this._navigate(1));
  }
}

customElements.define(CARD_TYPE, BakalariTimetableCard);

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: BakalariTimetableCard;
  }
}
