/**
 * Persistence helpers (localStorage) for Bakaláři cards.
 *
 * This module provides safe wrappers around localStorage with an in-memory
 * fallback when storage is unavailable (e.g., privacy mode or SSR).
 *
 * It also includes helpers for common value types (Set<string>, boolean),
 * and a small factory to create namespaced persistence bound to an entity.
 */

/* ------------------------------ Safe storage ------------------------------ */

type KV = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStore = new Map<string, string>();

const memoryKV: KV = {
  getItem: (k) => (memoryStore.has(k) ? (memoryStore.get(k) as string) : null),
  setItem: (k, v) => {
    memoryStore.set(k, v);
  },
  removeItem: (k) => {
    memoryStore.delete(k);
  },
};

function detectStorage(): KV {
  try {
    // Guard for environments without localStorage or with disabled storage.
    // #eslint-disable-next-line no-undef
    const ls = (typeof localStorage !== "undefined" ? localStorage : null) as Storage | null;
    if (!ls) return memoryKV;

    const testKey = "__persist_test__" + Math.random().toString(36).slice(2);
    ls.setItem(testKey, "1");
    ls.removeItem(testKey);

    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
    };
  } catch {
    return memoryKV;
  }
}

const kv: KV = detectStorage();

/* --------------------------------- Utils --------------------------------- */

function normalizeKeyPart(part?: string): string {
  const s = String(part ?? "unknown");
  // Replace non-word characters with underscores and trim repeated underscores.
  return s.replace(/\W+/g, "_").replace(/^_+|_+$/g, "");
}

/**
 * Build a namespaced storage key, e.g.:
 *   bakalari_grades_all_sensor_bakalari_grades_all_open_subjects
 */
export function buildStorageKey(
  entity: string | undefined,
  suffix: string,
  prefix = "bakalari_grades_all",
): string {
  const ent = normalizeKeyPart(entity || "unknown");
  const suf = normalizeKeyPart(suffix || "");
  const pre = normalizeKeyPart(prefix || "bakalari_grades_all");
  return `${pre}_${ent}_${suf}`;
}

/* ------------------------------ JSON helpers ----------------------------- */

export function saveJSON(key: string, value: unknown): void {
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = kv.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ---------------------------- Typed conveniences ------------------------- */

export function saveSet(key: string, set: Set<string>): void {
  // Persist as array of strings
  saveJSON(key, Array.from(set));
}

export function loadSet(key: string): Set<string> {
  const arr = loadJSON<any>(key, []);
  if (Array.isArray(arr)) {
    return new Set(arr.map((v) => String(v)));
  }
  return new Set();
}

export function saveBool(key: string, value: boolean): void {
  try {
    kv.setItem(key, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function loadBool(key: string, fallback = false): boolean {
  try {
    const v = kv.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

/* ------------------------------ Factory API ------------------------------ */

export interface PersistNamespaceOptions {
  prefix?: string; // default: "bakalari_grades_all"
}

/**
 * Create a namespaced persistence helper bound to an entity id.
 *
 * Example:
 *   const p = createPersist("sensor.bakalari_grades_all");
 *   p.saveSet("open_subjects", new Set(["1","2"]));
 *   const open = p.loadSet("open_subjects");
 */
export function createPersist(entity: string | undefined, opts: PersistNamespaceOptions = {}) {
  const prefix = opts.prefix ?? "bakalari_grades_all";

  const key = (suffix: string) => buildStorageKey(entity, suffix, prefix);

  return {
    key,
    saveJSON: (suffix: string, value: unknown) => saveJSON(key(suffix), value),
    loadJSON: <T>(suffix: string, fallback: T) => loadJSON<T>(key(suffix), fallback),

    saveSet: (suffix: string, set: Set<string>) => saveSet(key(suffix), set),
    loadSet: (suffix: string) => loadSet(key(suffix)),

    saveBool: (suffix: string, value: boolean) => saveBool(key(suffix), value),
    loadBool: (suffix: string, fallback?: boolean) => loadBool(key(suffix), fallback ?? false),

    // raw access if needed
    saveRaw: (suffix: string, raw: string) => {
      try {
        kv.setItem(key(suffix), raw);
      } catch {
        // ignore
      }
    },
    loadRaw: (suffix: string): string | null => {
      try {
        return kv.getItem(key(suffix));
      } catch {
        return null;
      }
    },
    remove: (suffix: string) => {
      try {
        kv.removeItem(key(suffix));
      } catch {
        // ignore
      }
    },
  };
}
