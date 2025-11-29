/**
 * Returns the child key for a given entity and hass object.
 * @param sensor The sensor name.
 * @param hass The hass object.
 * @returns The child key.
 */
export function get_child_key(sensor: string, hass: any): string {
  const stateObj = hass?.states[sensor] ?? {}
  const attrs = stateObj?.attributes ?? {}

  if (attrs.child_key) return attrs.child_key

  return ""
}

export function toast_msg(message: string, duration = 3000) {
  try {
    dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message, duration },
        bubbles: true,
        composed: true,
      }),
    );
  } catch (err) {
    // Fallback to notification event; log for developers to see in console.
    // This can happen in older HA versions or outside HA environment.
    console.warn("Failed to emit 'show-toast' event:", err);
  }
  // Fallback notification event
  dispatchEvent(
    new CustomEvent("hass-notification", {
      detail: { message },
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * Promise that will reslove after time
 */
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run async task with pending status

 * - calls setPending before start
 * - holds pending in minMs
 * - set pending to false after finished
 *
 * @param setPending setter
 * @param task Promise
 * @param minMs minimal time to pending be active
 * @returns result from task
 */
export async function runWithPending<T>(
  setPending: (v: boolean) => void,
  task: Promise<T>,
  minMs = 300
): Promise<T> {
  const start = Date.now();
  setPending(true);
  try {
    const result = await task;
    return result;
  } finally {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, minMs - elapsed);
    if (wait > 0) await sleep(wait);
    setPending(false);
  }
}
