import { useEffect, useState } from 'react';
import { warmUpBackend } from '../services/apiClient';

/**
 * Hides Render's free-tier cold start, and explains it when it cannot be hidden.
 *
 * The API spins down after 15 minutes without traffic and takes about a minute to come back.
 * Nothing in the app is broken when that happens, but a sign-in button that sits there for a
 * minute with no explanation is indistinguishable from a dead site — which is what this was
 * reported as.
 *
 * Two independent halves, deliberately in one hook so a page needs one line rather than three:
 *
 *  1. **The wake.** One `GET /actuator/health` on mount, fire-and-forget. Called from Home as
 *     well as the two auth pages: a visitor who lands on Home and reads for twenty seconds
 *     before clicking Sign up finds the instance already up, which removes the wait entirely
 *     rather than merely narrating it.
 *  2. **The notice.** While a form is submitting, flip `isWaking` after a short delay so the
 *     page can say what is going on.
 *
 * @param isSubmitting the caller's existing submit flag. Passed in rather than exposing a
 *   `start`/`stop` pair, so neither auth page's `handleSubmit` needs touching.
 * @returns `isWaking` — true once a submit has been running long enough to be worth explaining.
 */

/**
 * Long enough that a warm instance (measured: 0.5–0.8s for a real login round-trip) never shows
 * the notice, short enough that a cold one explains itself well before the ~60s wake is over.
 */
export const COLD_START_NOTICE_DELAY_MS = 4500;

export default function useBackendWakeUp(isSubmitting = false) {
  const [isWaking, setIsWaking] = useState(false);

  // Empty dep array: once per mount. Home is one component behind five paths, so a nav click
  // between /home and /faq does not re-fire it.
  useEffect(() => {
    // Deliberately not awaited and deliberately never calling setState on completion. The
    // result is not needed — the wake is the side effect — and a state write from an
    // unawaited promise is exactly what produces `act()` warnings in App.test.jsx, which
    // renders the whole router.
    warmUpBackend();
  }, []);

  useEffect(() => {
    if (!isSubmitting) {
      setIsWaking(false); // Resets after a failed attempt, so a retry starts from silence
      return undefined;
    }

    const timer = setTimeout(() => setIsWaking(true), COLD_START_NOTICE_DELAY_MS);
    return () => clearTimeout(timer); // Submit finished before the delay: no notice at all
  }, [isSubmitting]);

  return isWaking;
}
