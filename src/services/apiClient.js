/**
 * Single HTTP entry point for the GhibliAI backend.
 *
 * Everything that talks to the API goes through here so that there is exactly one
 * place to attach an auth token (see `buildAuthHeaders`) and exactly one place that
 * understands the backend's RFC 9457 ProblemDetail error bodies (`readProblem`).
 */

import { clearSession, getAuthHeader, markSessionRejected } from './authStorage';
import { notifyGenerationCreated } from './generationEvents';

// Vite exposes env vars prefixed with VITE_ (import.meta.env.VITE_*), inlined
// at build time -- restart the dev server after editing.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

/**
 * The single auth seam, filled in as of Phase 4. Reads the JWT from the session store
 * rather than from React context, because this module has no component above it — and
 * every call below already routed through here, so no request site changed.
 *
 * Returns `{}` when there is no usable token: the backend answers 401 with a
 * ProblemDetail, which is more informative than a request this layer refused to send.
 */
function buildAuthHeaders() {
  return getAuthHeader();
}

/**
 * Called when a request that *carried* a token comes back 401 — i.e. the session is
 * expired, revoked, or signed with a rotated secret. Registered by `AuthProvider`, which
 * is the only thing that can both clear React state and navigate.
 */
let unauthorizedHandler = null;

/** @returns an unregister function, so a remount cannot leave a stale closure installed. */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

/**
 * Error thrown for any non-2xx response. `status`, `detail`, `title` and `errors` come
 * from the backend where available so callers can decide how much to surface.
 *
 * `errors` is the per-field map that `GlobalExceptionHandler.handleMethodArgumentNotValid`
 * attaches to a 400 — `{ email: 'must be a well-formed email address', ... }` — which is
 * what lets the auth forms mark the offending input rather than only showing a banner.
 *
 * `code`, `retryable` and `retryAfterSeconds` are the extra ProblemDetail properties
 * `handleStabilityApiException` attaches — see `utils/generationErrors.js` for why status
 * alone is not enough to tell an empty Stability balance from an outage.
 */
export class ApiError extends Error {
  constructor(message, { status, detail, title, errors, code, retryable, retryAfterSeconds } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.title = title;
    this.errors = errors;
    this.code = code; // e.g. 'stability_credits_exhausted'; undefined for every other failure
    this.retryable = retryable; // Only the backend knows whether the same request could work
    this.retryAfterSeconds = retryAfterSeconds; // Drives the countdown on a 429
  }
}

/**
 * The single place that parses error bodies.
 *
 * The backend returns `application/problem+json` (RFC 9457) for every failure:
 * `{ type, title, status, detail, instance, errors? }`. Older/proxy responses may
 * still be plain text, so fall back to the raw body, then to the status line.
 */
async function readProblem(response) {
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    bodyText = '';
  }

  const fallback = bodyText || response.statusText || `Request failed with status ${response.status}`;

  if (!bodyText) {
    return { message: fallback };
  }

  let problem;
  try {
    problem = JSON.parse(bodyText);
  } catch {
    // Not JSON — treat the body as the message.
    return { message: bodyText };
  }

  const detail = problem?.detail || problem?.title || problem?.message;

  return {
    message: detail || fallback,
    detail: problem?.detail,
    title: problem?.title,
    // Only accept an object: a stray array or string here would break the field lookup
    // in the forms with a runtime error instead of degrading to the banner.
    errors:
      problem?.errors && typeof problem.errors === 'object' && !Array.isArray(problem.errors)
        ? problem.errors
        : undefined,
    // Type-checked rather than passed through: an older backend, a proxy error page or a
    // gateway can all put something unexpected in these keys, and `describeGenerationError`
    // must fall back to the generic wording in that case instead of rendering `[object Object]`.
    code: typeof problem?.code === 'string' ? problem.code : undefined,
    retryable: typeof problem?.retryable === 'boolean' ? problem.retryable : undefined,
    retryAfterSeconds:
      Number.isInteger(problem?.retryAfterSeconds) && problem.retryAfterSeconds > 0
        ? problem.retryAfterSeconds
        : undefined,
  };
}

/**
 * Shown instead of the backend's own 401 detail when a *token-bearing* request is
 * rejected. That detail — "Authentication required. Send a valid Authorization: Bearer
 * <token> header." — is written for whoever is integrating with the API, not for someone
 * who just lost their session mid-upload.
 */
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/**
 * Shared request path: injects auth headers, converts failures to ApiError, and
 * centralises the 401 → sign-out decision.
 *
 * @param auth   false for /api/v1/auth/**. Two things hang off this. Those endpoints need
 *               no header, and — more importantly — a 401 from them means "wrong password",
 *               not "session over". Treating them the same would make a typo'd password
 *               clear the session and redirect, so a logged-in user checking a second
 *               account would be silently logged out of the first.
 * @param parse  'blob' for image bytes, 'json' for a DTO, 'none' for an empty 204. Calling
 *               `.blob()` on a 204 would resolve to a 0-byte Blob rather than fail, so
 *               'none' is about not handing callers a value that looks like a payload.
 * @param signal an AbortSignal, so a component that unmounts mid-request can cancel it.
 *               The rejection is a DOMException named 'AbortError', NOT an ApiError —
 *               callers must check for it before showing an error, and the history hook
 *               and image loader both do.
 */
async function performRequest(
  path,
  { method = 'POST', headers = {}, body, auth = true, parse = 'blob', signal } = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: auth ? { ...headers, ...buildAuthHeaders() } : { ...headers },
    body,
    signal,
  });

  if (!response.ok) {
    const problem = await readProblem(response);

    // 401 only. A 403 from `handleAccessDenied` means the token is valid and the caller
    // simply may not have this resource — clearing the session there would send the user
    // through a pointless re-login that changes nothing.
    const sessionRejected = response.status === 401 && auth;

    if (sessionRejected) {
      // Before clearSession: clearing notifies subscribers, which can navigate away
      // synchronously, and the destination reads this flag as it renders.
      markSessionRejected();
      clearSession();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    throw new ApiError(sessionRejected ? SESSION_EXPIRED_MESSAGE : problem.message, {
      status: response.status,
      // `detail` keeps the backend's own wording even when the message above is
      // overridden, so nothing is lost for logging.
      detail: problem.detail ?? problem.message,
      title: problem.title,
      errors: problem.errors,
      code: problem.code, // Set only by the Stability handler; every other failure leaves it undefined
      retryable: problem.retryable,
      retryAfterSeconds: problem.retryAfterSeconds,
    });
  }

  if (parse === 'none') {
    return null;
  }

  if (parse === 'json') {
    return response.json();
  }

  return response.blob();
}

/** POST /api/v1/generate — multipart photo-to-art. Resolves to an image/png Blob. */
export async function generateFromPhoto(file, prompt) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('prompt', prompt);

  // No Content-Type header here on purpose: the browser must set the multipart boundary.
  const blob = await performRequest('/api/v1/generate', { body: formData });

  // After the await, so a failed generation does not tell history to refetch. The backend
  // has already committed the row by the time this line runs — see generationEvents.
  notifyGenerationCreated();
  return blob;
}

/** POST /api/v1/generate-from-text — JSON text-to-art. Resolves to an image/png Blob. */
export async function generateFromText(prompt, style) {
  const blob = await performRequest('/api/v1/generate-from-text', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style }),
  });

  notifyGenerationCreated();
  return blob;
}

/**
 * POST /api/v1/auth/signup — returns 201 with a usable token, so there is deliberately
 * no follow-up login call. Resolves to the AuthResponse:
 * `{ token, tokenType, expiresIn, userId, name, email, roles }`.
 *
 * Rejects with ApiError: 409 for a taken address, 400 with an `errors` map for a
 * malformed one or a short password.
 */
export async function signup({ name, email, password }) {
  return performRequest('/api/v1/auth/signup', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    auth: false,
    parse: 'json',
  });
}

/**
 * POST /api/v1/auth/login — 200 with the same AuthResponse shape.
 *
 * Rejects with ApiError: 401 "Incorrect email or password." for both a wrong password and
 * an unknown address (the backend hides the difference on purpose, so the UI cannot and
 * should not tell them apart), 400 with an `errors` map for an empty field.
 */
export async function login({ email, password }) {
  return performRequest('/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    auth: false,
    parse: 'json',
  });
}

// ── History ───────────────────────────────────────────────────────────────────────────
// All three go through `performRequest`, so they inherit the auth header, the
// ProblemDetail parsing and the 401 → sign-out behaviour. There is deliberately no second
// fetch path in this app, not even for the image bytes.

/**
 * Mirrors `GenerationHistoryController.DEFAULT_PAGE_SIZE`. Twelve divides by 2, 3 and 4,
 * so the last grid row is full at every breakpoint.
 */
export const HISTORY_PAGE_SIZE = 12;

/**
 * Mirrors `GenerationHistoryController.MAX_PAGE_SIZE`. Asking for more is a 400 with a
 * ProblemDetail, not a clamp, so callers must not exceed it.
 */
export const MAX_HISTORY_PAGE_SIZE = 100;

/**
 * GET /api/v1/generations — one page of the caller's own history, newest first.
 *
 * Resolves to the backend's `PageResponse` envelope, exactly these eight fields:
 * `{ content, page, size, totalElements, totalPages, first, last, numberOfElements }`,
 * where each `content` item is a `GenerationSummaryResponse`:
 * `{ id, type, prompt, style, engineId, width, height, imageSizeBytes, createdAt }`.
 *
 * `content` carries no image bytes and no image id — the bytes are addressed by the
 * *generation* id via `fetchGenerationImage`. `width`, `height` and `imageSizeBytes` are
 * nullable for rows whose PNG header could not be read.
 *
 * There is no `sort` parameter on this endpoint. Order is fixed server-side, so the
 * newest generation is always `content[0]` of page 0.
 *
 * Rejects with ApiError 400 when `page < 0` or `size` is outside 1..MAX_HISTORY_PAGE_SIZE.
 */
export async function fetchGenerations({ page = 0, size = HISTORY_PAGE_SIZE, signal } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });

  return performRequest(`/api/v1/generations?${query.toString()}`, {
    method: 'GET',
    parse: 'json',
    signal,
  });
}

/**
 * GET /api/v1/generations/{id}/image — the PNG for one generation, as a Blob.
 *
 * This is the endpoint `<img src>` cannot reach: the browser's image loader sends no
 * `Authorization` header, so a naive `src={API_BASE_URL + path}` 401s with nothing in the
 * console to explain it. The caller must wrap this Blob in `URL.createObjectURL` — and
 * then revoke it. See `GenerationCard` for the lifecycle.
 *
 * Rejects with ApiError 404 for an id that is not the caller's or no longer exists.
 */
export async function fetchGenerationImage(id, { signal } = {}) {
  return performRequest(`/api/v1/generations/${encodeURIComponent(id)}/image`, {
    method: 'GET',
    parse: 'blob',
    signal,
  });
}

/**
 * DELETE /api/v1/generations/{id} — removes the metadata and the image document.
 *
 * Resolves to null on the backend's 204. Not idempotent: deleting twice gives 204 then a
 * 404 ApiError, which the hook treats as "already gone" rather than as a failure.
 */
export async function deleteGeneration(id, { signal } = {}) {
  return performRequest(`/api/v1/generations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    parse: 'none',
    signal,
  });
}
