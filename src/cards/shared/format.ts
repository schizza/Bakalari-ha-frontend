/**
 * Shared formatting utilities for dates and numbers.
 *
 * These helpers are small, dependency-free and safe to use in both browser and
 * SSR-like environments (fallbacks are provided).
 */

export type DateInput = string | number | Date | null | undefined;

/**
 * Resolve a reasonable default locale.
 * - Tries the browser's navigator.language when available
 * - Falls back to "cs-CZ"
 */
export function defaultLocale(): string {
  try {
    if (typeof navigator !== "undefined" && navigator?.language) {
      return navigator.language;
    }
  } catch {
    // ignore
  }
  return "cs-CZ";
}

/**
 * Convert arbitrary input to a Date or null if it's not valid.
 */
function coerceDate(input: DateInput): Date | null {
  if (input == null || input === "") return null;
  try {
    const d = input instanceof Date ? input : new Date(input as any);
    const t = d.getTime();
    return Number.isFinite(t) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Format date and time with given locale and styles.
 * Defaults: locale = defaultLocale(), dateStyle = "medium", timeStyle = "short".
 * Returns empty string for empty/invalid input.
 */
export function formatDateTime(
  input?: DateInput,
  opts?: {
    locale?: string;
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  },
): string {
  const d = coerceDate(input);
  if (!d) return "";
  const locale = opts?.locale || defaultLocale();
  const dateStyle = opts?.dateStyle ?? "medium";
  const timeStyle = opts?.timeStyle ?? "short";

  try {
    return d.toLocaleString(locale, { dateStyle, timeStyle } as Intl.DateTimeFormatOptions);
  } catch {
    // Best-effort fallback
    return d.toISOString();
  }
}

/**
 * Format only date part with given locale and style.
 * Default style is "medium".
 */
export function formatDateOnly(
  input?: DateInput,
  opts?: { locale?: string; dateStyle?: Intl.DateTimeFormatOptions["dateStyle"] },
): string {
  const d = coerceDate(input);
  if (!d) return "";
  const locale = opts?.locale || defaultLocale();
  const dateStyle = opts?.dateStyle ?? "medium";
  try {
    return d.toLocaleDateString(locale, { dateStyle } as Intl.DateTimeFormatOptions);
  } catch {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }
}

/**
 * Format only time part with given locale and style.
 * Default style is "short".
 */
export function formatTimeOnly(
  input?: DateInput,
  opts?: { locale?: string; timeStyle?: Intl.DateTimeFormatOptions["timeStyle"] },
): string {
  const d = coerceDate(input);
  if (!d) return "";
  const locale = opts?.locale || defaultLocale();
  const timeStyle = opts?.timeStyle ?? "short";
  try {
    return d.toLocaleTimeString(locale, { timeStyle } as Intl.DateTimeFormatOptions);
  } catch {
    return d.toTimeString().split(" ")[0]; // HH:MM:SS
  }
}

/**
 * Trim trailing zeros and optional trailing decimal separator (dot).
 * Example: "1.2300" -> "1.23", "5.000" -> "5", "2." -> "2"
 */
export function stripTrailingZerosDot(numStr: string): string {
  return numStr.replace(/\.?0+$/, (m) => (m.startsWith(".") ? m.slice(1) : ""));
}

/**
 * Safe numeric formatter:
 * - Returns "—" for non-finite values
 * - Uses fixed decimal places then trims trailing zeros and the dot
 *   (locale-agnostic, uses dot as decimal separator)
 */
export function safeNum(n: any, digits = 3): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return stripTrailingZerosDot(v.toFixed(digits));
}

/**
 * Locale-aware number formatter with graceful fallback.
 * - Returns "—" for non-finite values
 * - Uses Intl.NumberFormat when available
 * - Fallbacks to safeNum(...) formatting if Intl.NumberFormat fails
 */
export function safeNumLocale(
  n: any,
  opts?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";

  const locale = opts?.locale || defaultLocale();
  const minimumFractionDigits = opts?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 3;

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(v);
  } catch {
    // Fallback to non-locale-aware formatting
    return safeNum(v, Math.max(minimumFractionDigits, maximumFractionDigits));
  }
}
