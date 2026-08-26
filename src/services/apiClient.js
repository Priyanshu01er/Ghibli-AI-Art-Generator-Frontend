/**
 * Single HTTP entry point for the GhibliAI backend.
 *
 * Everything that talks to the API goes through here so that there is exactly one
 * place to attach an auth token (see `buildAuthHeaders`) and exactly one place that
 * understands the backend's RFC 9457 ProblemDetail error bodies (`readProblem`).
 */

import { clearSession, getAuthHeader, markSessionRejected } from './authStorage';

// CRA only exposes env vars prefixed with REACT_APP_, and only at build time.
// import.meta.env / VITE_* do not exist in react-scripts 5.
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

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
 */
export class ApiError extends Error {
  constructor(message, { status, detail, title, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.title = title;
    this.errors = errors;
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
 * @param auth  false for /api/v1/auth/**. Two things hang off this. Those endpoints need
 *              no header, and — more importantly — a 401 from them means "wrong password",
 *              not "session over". Treating them the same would make a typo'd password
 *              clear the session and redirect, so a logged-in user checking a second
 *              account would be silently logged out of the first.
 */
async function performRequest(path, { method = 'POST', headers = {}, body, auth = true, parse = 'blob' } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: auth ? { ...headers, ...buildAuthHeaders() } : { ...headers },
    body,
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
    });
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
  return performRequest('/api/v1/generate', { body: formData });
}

/** POST /api/v1/generate-from-text — JSON text-to-art. Resolves to an image/png Blob. */
export async function generateFromText(prompt, style) {
  return performRequest('/api/v1/generate-from-text', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style }),
  });
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
