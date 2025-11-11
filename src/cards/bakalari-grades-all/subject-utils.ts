/**
 * Subject utilities for Bakaláři cards.
 *
 * This module extracts subject grouping, filtering and sorting logic
 * from the card component to keep rendering code clean and reusable.
 */

export type AnyObj = Record<string, any>;

export interface SubjectSummary {
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
}

export interface ConfigForSubjects {
  // sorting/filtering
  sort_subjects_by?: "name" | "abbr" | "count" | "avg" | "wavg" | "last_date";
  sort_subjects_dir?: "asc" | "desc";
  filter_subjects_min_count?: number;
  include_subject_ids?: string[];
  exclude_subject_ids?: string[];
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
export function extractAllMarksBySubject(attrs: AnyObj): Mark[] {
  
}

export function extractAllMarks(attrs: AnyObj): RecentMark[] {
  const pref = String(marksAttributePref || "recent").trim();
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
  attrs: AnyObj,
  marksAttributePref?: string,
): Map<string, RecentMark[]> {
  const grouped = new Map<string, RecentMark[]>();
  const rec: RecentMark[] = extractAllMarks(attrs, marksAttributePref);

  for (const m of rec) {
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

export function extractSubjects(attrs: AnyObj): SubjectSummary[] {
  const list: any = Array.isArray(attrs?.by_subject) ? attrs.by_subject : [];
  return (list as SubjectSummary[]).slice();
}

export function filteredSortedSubjectsFromAttrs(
  attrs: AnyObj,
  cfg: ConfigForSubjects,
): SubjectSummary[] {
  return filteredSortedSubjects(extractSubjects(attrs), cfg);
}

export function filteredSortedSubjects(
  subjects: SubjectSummary[],
  cfg: ConfigForSubjects,
): SubjectSummary[] {
  let list: SubjectSummary[] = Array.isArray(subjects) ? subjects.slice() : [];
  if (!list.length) return [];

  const minCount = Math.max(0, Number(cfg.filter_subjects_min_count || 0));
  const include = (cfg.include_subject_ids || []).map((s) => normalizeId(String(s)));
  const exclude = (cfg.exclude_subject_ids || []).map((s) => normalizeId(String(s)));

  list = list.filter((s) => {
    const key = subjectKeyFromSummary(s);
    if (!key) return false;
    const candidate = normalizeId(String(s.subject_id || key));
    if (include.length && !include.includes(candidate)) return false;
    if (exclude.length && exclude.includes(candidate)) return false;
    if (Number(s.count || 0) < minCount) return false;
    return true;
  });

  const by = String(
    cfg.sort_subjects_by || "name",
  ).toLowerCase() as ConfigForSubjects["sort_subjects_by"];
  const dir = String(cfg.sort_subjects_dir || "asc").toLowerCase();
  const asc = dir === "asc";

  const byVal = (s: SubjectSummary): any => {
    switch (by) {
      case "abbr":
        return abbr(s.subject_abbr);
      case "count":
        return Number(s.count || 0);
      case "avg":
        // keep undefined as +Infinity so they end last in asc; note: they end first in desc
        return Number(s.avg ?? Number.POSITIVE_INFINITY);
      case "wavg":
        return Number(s.wavg ?? Number.POSITIVE_INFINITY);
      case "last_date":
        return new Date(s.last_date || 0).getTime();
      case "name":
      default:
        return subjectTitle(s).toLowerCase();
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

  const lim = Math.max(0, Number(cfg.limit_subjects || 0));
  if (lim > 0) list = list.slice(0, lim);

  return list;
}
