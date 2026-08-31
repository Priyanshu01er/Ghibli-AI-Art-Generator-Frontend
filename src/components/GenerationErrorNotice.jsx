import { useEffect, useState } from 'react';
import { describeGenerationError } from '../utils/generationErrors';

/**
 * The one place a failed generation is rendered.
 *
 * Both create sections previously printed a single red line, which gave every cause the same
 * weight: "please enter a description" looked exactly as alarming as "Stability AI is down".
 * This card separates the three things the user actually needs — what happened, what it means,
 * and whether pressing the button again could help — and takes its palette from `tone` so a
 * transient upstream blip is amber rather than red.
 *
 * Purely presentational: it owns no request. `onRetry` is the section's own submit handler, so
 * a retry re-reads the live prompt and upload instead of replaying a captured payload.
 */

/** Tailwind classes per tone, kept together so the two variants cannot drift apart. */
const TONE_STYLES = {
  // Amber matches the session-expired notice on LoginPage: something to note, not to fix.
  soft: {
    card: 'border-amber-300 bg-amber-50 text-amber-800',
    icon: 'text-amber-600',
    button: 'border-amber-400 bg-white text-amber-800 hover:bg-amber-100',
  },
  // Red is reserved for a real decision: top up the balance, reword the prompt, replace the key.
  hard: {
    card: 'border-red-300 bg-red-50 text-red-700',
    icon: 'text-red-500',
    button: 'border-red-400 bg-white text-red-700 hover:bg-red-100',
  },
};

function GenerationErrorNotice({ error, onRetry, isRetrying = false }) {
  const descriptor = describeGenerationError(error);
  const retryAfterSeconds = descriptor?.retryAfterSeconds ?? null;
  const [secondsLeft, setSecondsLeft] = useState(retryAfterSeconds);

  /*
   * A 429 is the only failure that names a wait, and it is the only one where an instant retry
   * is actively harmful — it extends the rate limit. `error` is the dependency rather than the
   * number so a second, identical 429 restarts the countdown instead of leaving it at zero.
   */
  useEffect(() => {
    setSecondsLeft(retryAfterSeconds);

    if (!retryAfterSeconds) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current && current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [error, retryAfterSeconds]);

  if (!descriptor) {
    return null;
  }

  const styles = TONE_STYLES[descriptor.tone] ?? TONE_STYLES.hard;
  const waiting = Boolean(secondsLeft && secondsLeft > 0);
  // No button at all when the backend said retrying cannot work, and none when the caller did
  // not supply a handler — the client-side validation messages have nothing to retry.
  const showRetry = descriptor.retryable && typeof onRetry === 'function';

  return (
    // role="alert" so a screen reader announces the failure instead of it only appearing visually.
    // `panel-in` and not `rise-in`: 0.26s, because a failure has to be noticed, and the site's 0.7s
    // reveal is a leisurely entrance for the one thing on screen that is asking for a decision.
    <div
      role="alert"
      className={`mt-3 animate-panel-in rounded-2xl border px-4 py-3 ring-1 ring-inset ring-white/40 motion-reduce:animate-none ${styles.card}`}
    >
      <div className="flex items-start gap-3">
        {/* strokeWidth 1.8 and the 20px box match the inline icons in FeaturesSection. */}
        <svg
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>

        <div className="min-w-0 flex-1">
          {/* Absent for the client-side guards, which read as one plain sentence, as before. */}
          {descriptor.title ? <p className="text-sm font-semibold">{descriptor.title}</p> : null}
          <p className={`text-sm font-medium ${descriptor.title ? 'mt-0.5' : ''}`}>{descriptor.message}</p>
          {descriptor.hint ? <p className="mt-1 text-sm opacity-80">{descriptor.hint}</p> : null}

          {showRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={waiting || isRetrying}
              className={`mt-3 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${styles.button} ${
                waiting || isRetrying ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {/* The countdown replaces the label rather than sitting beside it, so the button
                  itself explains why it is disabled. */}
              {waiting ? `Try again in ${secondsLeft}s` : isRetrying ? 'Trying again…' : 'Try again'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GenerationErrorNotice;
