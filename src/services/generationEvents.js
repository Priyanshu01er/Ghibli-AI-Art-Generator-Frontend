/**
 * A single event: "a generation was just created".
 *
 * This exists to answer one requirement — a new generation must appear in history
 * without a manual refresh — without wiring a callback prop from `CreatePage` down
 * through `PhotoToArtSection` and `TextToArtSection`. Those two components stay
 * untouched: the notification is published by `apiClient`, which is already the only
 * code path a generation can travel, so there is nothing for a caller to remember to do.
 *
 * Why this is safe to fire from the success path of a generation: `recordQuietly` runs
 * synchronously in `GenerationController` *before* the PNG is written to the response, so
 * by the time the POST resolves the history row is already committed. A subscriber that
 * refetches page 0 here is not racing the write — it will see the new row.
 *
 * A module-level store rather than React context on purpose. `apiClient` is a plain
 * module with no component above it and cannot read context, which is the same reason
 * `authStorage` exists.
 */

const listeners = new Set();

/**
 * @param listener called with no arguments after any successful generation
 * @returns an unsubscribe function
 */
export function subscribeToGenerations(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called by `apiClient` after a generation POST resolves.
 *
 * Iterates a copy, because a listener is allowed to unsubscribe while being notified —
 * mutating the live Set mid-iteration would skip whichever listener followed it.
 *
 * Each listener is called inside its own try/catch, and that is load-bearing rather than
 * defensive habit: this runs on the success path of a generation the user has already
 * paid for and can see. A throwing subscriber must not turn a delivered image into a
 * rejected promise and an error banner.
 */
export function notifyGenerationCreated() {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.error('A generation listener threw; the generation itself was unaffected.', error);
    }
  }
}
