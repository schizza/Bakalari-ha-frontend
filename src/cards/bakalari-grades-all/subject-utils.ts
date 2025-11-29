/**
 * Subject utilities for Bakaláři cards.
 *
 * This module extracts subject grouping, filtering and sorting logic
 * from the card component to keep rendering code clean and reusable.
 */

import { Config } from '../bakalari-grades-all';
import type { HomeAssistant } from "custom-card-helpers"
import { toast_msg } from '../shared/utils';

export type AnyObj = Record<string, any>;

export interface SubjectSummary {
  sensor_name?: string;
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

export interface RecentMark {
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
  confirmed?: boolean;
}

export interface Mark {
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
  confirmed?: boolean;
}

export interface ConfigForSubjects {
  // sorting/filtering
  sort_subjects_by?: "name" | "abbr" | "count" | "avg" | "wavg" | "last_date";
  sort_subjects_dir?: "asc" | "desc";
  filter_subjects_min_count?: number;
  limit_subjects?: number;

  // marks source
  marks_attribute?: string;
}

/* ----------------------------- Normalization ----------------------------- */

export function normalizeId(id?: string | number | null): string {
  return String(id ?? "").trim();
}

export function abbr(s?: string): string {
  return String(s ?? "").trim();
}

export function subjectTitle(s: SubjectSummary, fallback = "Neznámý předmět"): string {
  return (s.subject_name || abbr(s.subject_abbr) || fallback).trim();
}

export function subjectKeyFromSummary(s: SubjectSummary): string {
  return (
    normalizeId(s.subject_id as any) || abbr(s.subject_abbr) || String(s.subject_name ?? "").trim()
  );
}

export function subjectKeyFromMark(m: RecentMark): string {
  return (
    normalizeId(m.subject_id as any) || abbr(m.subject_abbr) || String(m.subject_name ?? "").trim()
  );
}

/* --------------------------------- Marks --------------------------------- */

function isNumber(str: string): boolean {
  if (typeof str !== "string") return false

  const s = str.trim()

  if (s === "") return false
  const normalized = s.replace(",", ".");
  const n = Number(normalized);

  return Number.isFinite(n)
}
export function shortenMark(str: string | undefined): string {

  if (str === undefined) return "-"

  if (isNumber(str)) {
    return str
  }
  if (str.length > 3) return str[0].toLocaleUpperCase()

  return str;
}
/**
 * Extrahuje známky z předaného objektu (objekt musí obsahovat pole "recent")
 * @param attrs
 * @returns
 */
export function extractAllMarks(attrs: AnyObj): RecentMark[] {
  const pref = "recent";
  let src: any = attrs?.[pref];
  if (!Array.isArray(src)) {
    // fallbacks similar to original implementation
    if (Array.isArray(attrs?.all)) src = attrs.all;
    else if (Array.isArray(attrs?.marks)) src = attrs.marks;
    else if (Array.isArray(attrs?.recent)) src = attrs.recent;
    else src = [];
  }
  return (src as any[]).slice() as RecentMark[];
}

/**
 * Group marks by subject key and sort each subject's marks by date desc.
 */
export function groupMarksBySubject(
  marks: AnyObj,
): Map<string, RecentMark[]> {
  const grouped = new Map<string, RecentMark[]>();
  // const rec: RecentMark[] = extractAllMarks(attrs);

  for (const m of Object.values(marks)) {
    const key = subjectKeyFromMark(m);
    if (!key) continue;
    const arr = grouped.get(key) || [];
    arr.push(m);
    grouped.set(key, arr);
  }

  // sort desc by date within each group
  for (const [k, arr] of grouped) {
    arr.sort((a, b) => {
      const at = new Date(a.date || 0).getTime();
      const bt = new Date(b.date || 0).getTime();
      return bt - at;
    });
    grouped.set(k, arr);
  }
  return grouped;
}

/* ------------------------------- Subjects -------------------------------- */

/**
 * Vrací seznam senzorů s předměty z `Helper` senzoru.
 *
 * @param hass
 * @param config
 * @returns
 */
export function getSubjectsSensorNames(hass: HomeAssistant, config: Config) {

  const entityId = config?.entity;
  if (!entityId) return [];

  const state = hass.states[entityId];
  if (!state) return [];

  const sensorMap: unknown = state.attributes["sensor_map"];

  if (!sensorMap) return [];

  return Object.values(sensorMap as Record<string, string>)
}
/**
 * Retrieve Subject Info and Marks from the sensor
 *
 * @param hass
 * @param sensor_name
 * @returns subject info, Marks for Suject
 */
export function getSubjectInfoAndMarskFromSensor(hass: HomeAssistant, sensor_name: string): {
  subject: SubjectSummary;
  marks: RecentMark[];
} {

  if (!sensor_name) return { subject: {}, marks: [] };

  const sensor = hass?.states[sensor_name];
  if (!sensor) return { subject: {}, marks: [] };

  const subject = extractSubjectInfo(sensor)
  const marks = extractAllMarks(sensor["attributes"])

  return { subject, marks }
}

/**
 * Extract subject info from sensor
 *
 * @param sensor Sensor object
 * @returns SubjectSummary object
 */
export function extractSubjectInfo(sensor: any): SubjectSummary {
  const attr = sensor["attributes"];
  const subj = attr["subject"] as Record<string, any>;

  if (!subj || !subj.subject_id) {
    const sum: SubjectSummary = {
      sensor_name: sensor.entity_id,
      subject_id: "",
      subject_name: "Neznámý předmět",
      subject_abbr: "",
      count: 0,
      new_count: 0,
      numeric_count: 0,
      non_numeric_count: 0,
      last_date: "",
      last_text: "",
      avg: 0,
      wavg: 0
    }
    return sum;
  }

  const summary: SubjectSummary = {
    sensor_name: sensor.entity_id,
    subject_id: subj["subject_id"],
    subject_name: subj["subject_name"],
    subject_abbr: subj["subject_abbr"],
    count: subj["count"],
    new_count: subj["new_count"],
    numeric_count: subj["numeric_count"],
    non_numeric_count: subj["non_numeric_count"],
    last_text: subj["last_text"],
    last_date: subj["last_date"],
    avg: subj["avg"],
    wavg: subj["wavg"],
  }

  return summary;
}

/**
 * Sort subject a return sorted SubjectSummary[]
 * @param hass
 * @param subjectList
 * @param sortBy
 * @param sortOrder
 * @returns SubjectSummary[]
 */
export function sortSubjects(hass: any, subjectList: string[] | Set<string>, sortBy?: string, sortOrder?: string): SubjectSummary[] {

  const by = String(sortBy || "name").toLowerCase();
  const dir = String(sortOrder || "asc").toLowerCase();
  const asc = dir === "asc";
  const _subjectList = (subjectList instanceof Set) ? [...subjectList] : subjectList

  const listOfSubjects: SubjectSummary[] = Object.values(_subjectList).map(subj =>
    getSubjectInfoAndMarskFromSensor(hass, subj).subject
  ).slice();

  const coll = new Intl.Collator("cs", { sensitivity: "base", numeric: false });

  const byVal = (s: SubjectSummary): any => {
    switch (by) {
      case "abbr":
        return abbr(s.subject_abbr);
      case "count":
        return Number(s.count || 0);
      case "avg":
        return Number(s.avg ?? Number.POSITIVE_INFINITY);
      case "wavg":
        return Number(s.wavg || Number.POSITIVE_INFINITY);
      case "last_date":
        return new Date(s.last_date || 0).getTime();
      case "name":
        return subjectTitle(s);
      default:
        return subjectTitle(s);
    }
  }

  listOfSubjects
    .sort((a, b) => {
      const av = byVal(a);
      const bv = byVal(b);

      let res: number;
      if (typeof av === "string" && typeof bv === "string") {
        res = coll.compare(av, bv);
      } else {
        res = av < bv ? -1 : av > bv ? 1 : 0;
      }
      return asc ? res : -res;
    })

  return listOfSubjects
}

export function getRecentMarks(hass: any, sensorNames: string[], limit?: number): RecentMark[] {

  const all: RecentMark[] = sensorNames
    .map(s => getSubjectInfoAndMarskFromSensor(hass, s).marks)
    .flat();

  const recent: RecentMark[] = all
    .slice()
    .sort((a, b) => {
      const at = new Date(a.date || 0).getTime();
      const bt = new Date(b.date || 0).getTime();
      return bt - at;
    })
    .slice(0, limit || all.length)

  return recent
}


export function extractSubjects(attrs: AnyObj): SubjectSummary[] {
  const list: any = Array.isArray(attrs?.by_subject) ? attrs.by_subject : [];
  return (list as SubjectSummary[]).slice();
}

/**
 *
 * @param attrs Record of all marks sensor
 * @param hass
 * @returns total cound of unconfirmed makrs.
 */
export function count_unconfirmed(attrs: AnyObj, hass: any): Array<string> {

  const src: Record<string, any> = attrs.attributes.sensor_map;
  const count = Object.values(src)
    .map(s => getSubjectInfoAndMarskFromSensor(hass, s).marks)
    .flat()
    .filter(mark => !mark.confirmed)
    .map(m => m.id as string);

  return count
}

export async function signMarks(child_key: string, subjects: Array<string>, hass: any) {

  try {
    await hass.callService("bakalari", "sign_all_marks", {
      child_key: child_key,
      subjects: subjects
    });
  }
  catch (err) {
    toast_msg("Nepodařilo se podepsat známky. (" + err + ")", 4000)
  }
}
