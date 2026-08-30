/**
 * Turns a failed generation into words a person can act on.
 *
 * Both create sections used to print one flat line — `Network response was not ok. Status:
 * 502. Message: Generation failed` — for every possible cause, because that is genuinely all
 * the backend told them. It now attaches a `code` to the ProblemDetail (see
 * `GlobalExceptionHandler.handleStabilityApiException`), and this module is the one place that
 * translates those codes into copy.
 *
 * Kept out of the components for the same reason as `generationLabels.js`: two sections need
 * the identical vocabulary, and an error message that differs between the Photo and Text tabs
 * for the same cause reads as two different bugs.
 */

/**
 * Keyed by the backend's `code`, which is a stable identifier and never localised — matching
 * on `detail` text instead would break the moment someone rewords a sentence in the enum.
 * One entry (`client_timeout`) is raised by the client itself; it is keyed the same way so it
 * needs no separate branch below.
 *
 * `tone` picks the visual treatment: 'soft' (amber) for a transient upstream condition that
 * says nothing about what the user did, 'hard' (red) for something that needs a real decision
 * — a topped-up balance, a replaced key, a reworded prompt.
 */
const FAILURE_DESCRIPTORS = {
  stability_credits_exhausted: {
    title: 'Out of generation credits',
    message: 'The Stability AI account behind Ghibli AI has no credits left, so no new artwork can be generated.',
    hint: 'Top up the Stability AI balance, then generate again.',
    tone: 'hard',
  },
  stability_rate_limited: {
    title: 'Too many requests',
    message: 'Stability AI is rate limiting this account after a burst of generations.',
    hint: 'Wait a few seconds, then try again.',
    tone: 'soft',
  },
  stability_auth_failed: {
    title: 'Image service key rejected',
    message: "Stability AI refused this server's API key, so it cannot generate anything at the moment.",
    hint: 'The key is missing, expired or revoked — retrying will not help until it is replaced.',
    tone: 'hard',
  },
  stability_request_rejected: {
    title: 'Prompt was refused',
    message: "Stability AI's content filter rejected this request, so no image was created.",
    hint: 'Try rewording the description, or use a different photo.',
    tone: 'hard',
  },
  stability_unavailable: {
    title: 'Image service unavailable',
    message: 'Stability AI is not responding right now. This is an outage on their side, not a problem with your prompt.',
    hint: 'Try again in a moment.',
    tone: 'soft',
  },
  stability_timeout: {
    title: 'Image service timed out',
    message: 'Stability AI took too long to answer and the request was abandoned.',
    hint: 'Busy periods usually clear quickly — try again.',
    tone: 'soft',
  },
  stability_error: {
    title: 'Generation failed upstream',
    message: 'Stability AI returned an unexpected error, so the artwork could not be generated.',
    hint: 'Try again; if it keeps happening the server log has the upstream response.',
    tone: 'hard',
  },
  /**
   * The one code in this map that is *not* from the backend — `apiClient.performRequest` raises
   * it when its own 120s timer fires, because a request that never got a reply has no
   * ProblemDetail to read a code out of. It lives here rather than in the component so a
   * timeout reads the same on both create tabs, like every other cause.
   */
  client_timeout: {
    title: 'Ghibli AI did not answer in time',
    message:
      'The request was given up on after two minutes. The API runs on a free Render instance that ' +
      'spins down when idle, so the first request after a quiet spell can be very slow.',
    hint: 'Wait a few seconds and try again — the second attempt usually goes through.',
    tone: 'soft', // Nothing the user did, and nothing to fix: the same request may well work
  },
};

/** Shown when `fetch` itself rejected — no response, so no status and no ProblemDetail. */
const OFFLINE_DESCRIPTOR = {
  title: 'Cannot reach Ghibli AI',
  message: 'The request never got a reply from the Ghibli AI server.',
  hint: 'Check that the backend is running, then try again.',
  tone: 'soft',
  retryable: true,
};

/**
 * Every generation failure, reduced to what the notice needs to render.
 *
 * @param error either an `ApiError`, a thrown `Error`, or a plain string for the client-side
 *   validation messages ("Please enter a description…"). Those are not API failures and must
 *   not be dressed up as one, so they come back as a bare message with no title and no retry.
 * @returns `{ title, message, hint, tone, retryable, retryAfterSeconds }`
 */
export function describeGenerationError(error) {
  if (!error) {
    return null;
  }

  // The client-side guards (empty prompt, no upload, >5MB file) still pass a string.
  if (typeof error === 'string') {
    return { title: null, message: error, hint: null, tone: 'hard', retryable: false, retryAfterSeconds: null };
  }

  const descriptor = error.code ? FAILURE_DESCRIPTORS[error.code] : undefined;

  if (descriptor) {
    return {
      ...descriptor,
      // `retryable` comes from the backend, which is the only side that knows: the frontend
      // guessing it would eventually offer "Try again" for an empty balance, which is a lie.
      // The descriptor's tone implies a default only if the property is missing entirely.
      retryable: typeof error.retryable === 'boolean' ? error.retryable : descriptor.tone === 'soft',
      retryAfterSeconds: error.retryAfterSeconds ?? null,
    };
  }

  // No status at all means fetch rejected before any response — a dead backend or lost network.
  if (error.status === undefined) {
    return { ...OFFLINE_DESCRIPTOR, retryAfterSeconds: null };
  }

  // A real HTTP failure with no Stability code: a validation 400, an expired session, a 500.
  // The backend's own `detail` is already the most specific thing available, so show that
  // rather than inventing a heading for a case this module does not recognise.
  return {
    title: error.status >= 500 ? 'Generation failed' : null,
    message: error.message || 'Failed to generate image.',
    hint: null,
    tone: error.status >= 500 ? 'soft' : 'hard',
    // A 5xx with no code is a server-side blip worth one retry; a 4xx is the caller's to fix.
    retryable: error.status >= 500,
    retryAfterSeconds: null,
  };
}
