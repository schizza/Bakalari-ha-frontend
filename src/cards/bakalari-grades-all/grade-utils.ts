/**
 * Grade utilities for Bakaláři cards.
 *
 * This module centralizes parsing, bucketing and styling helpers for grades,
 * so UI components can stay lean and consistent.
 */

/** Known grade buckets used for color coding. */
export type GradeBucket = 1 | 2 | 3 | 4 | 5;

/** Hex colors for grade buckets (rounded values). */
export const GRADE_COLORS: Record<GradeBucket, string> = {
  1: "#2e7d32",
  2: "#558b2f",
  3: "#f9a825",
  4: "#ef6c00",
  5: "#c62828",
} as const;

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Normalize grade input to a comparable string (trim + replace comma with dot). */
export function normalizeGradeInput(txt?: string): string {
  return String(txt ?? "").trim().replace(",", ".");
}

/**
 * Parse textual grade to a number.
 * Accepts "1".."5" optionally with decimals (e.g. "1.5" or "2,0").
 * Returns null when the value doesn't look like a valid grade.
 */
export function parseGradeNumber(txt?: string): number | null {
  if (!txt) return null;
  const s = normalizeGradeInput(txt);
  const m = s.match(/^([1-5])(\.\d+)?$/);
  if (!m) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Convert parsed grade to a color bucket (rounded to nearest integer in 1..5).
 */
export function gradeBucketFromNumber(n?: number | null): GradeBucket | null {
  if (!Number.isFinite(n as number)) return null;
  const r = clamp(Math.round(n as number), 1, 5) as GradeBucket;
  return (r >= 1 && r <= 5 ? r : null) as GradeBucket | null;
}

/**
 * Derive bucket directly from text.
 */
export function gradeBucket(txt?: string): GradeBucket | null {
  return gradeBucketFromNumber(parseGradeNumber(txt));
}

/**
 * Resolve color hex for a bucket.
 */
export function gradeColorHexFromBucket(bucket?: GradeBucket | null): string | null {
  if (!bucket) return null;
  return GRADE_COLORS[bucket] ?? null;
}

/**
 * Resolve color hex directly from text input.
 */
export function gradeColorHexFromText(txt?: string): string | null {
  return gradeColorHexFromBucket(gradeBucket(txt));
}

/**
 * Produce a CSS class name for a grade, e.g. "grade-1".."grade-5".
 * Returns empty string when colors are disabled or the value is invalid.
 */
export function gradeClass(txt?: string, showColors: boolean = true): string {
  if (!showColors) return "";
  const b = gradeBucket(txt);
  return b ? `grade-${b}` : "";
}

/**
 * Produce an inline style string for a grade mark background/border.
 * Prefer CSS classes for performance and readability; this is kept
 * for backward compatibility or dynamic cases.
 */
export function gradeStyleInline(txt?: string, showColors: boolean = true): string {
  if (!showColors) return "";
  const hex = gradeColorHexFromText(txt);
  if (!hex) return "";
  // Color-mix provides a subtle background and a semi-transparent border.
  return `background: color-mix(in oklab, ${hex} 20%, transparent); border-color: ${hex}40;`;
}

/**
 * Produce a style object map for use with styleMap directive.
 * Prefer CSS classes for performance and readability; this is kept
 * for backward compatibility or dynamic cases.
 */
export function gradeStyleMap(
  txt?: string,
  showColors: boolean = true,
): Record<string, string> {
  if (!showColors) return {};
  const hex = gradeColorHexFromText(txt);
  if (!hex) return {};
  return {
    background: `color-mix(in oklab, ${hex} 20%, transparent)`,
    "border-color": `${hex}40`,
  };
}
