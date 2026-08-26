/**
 * The one place the persisted session lives.
 *
 * Split out from both `apiClient` and `AuthContext` on purpose. `apiClient` is a plain
 * module — it cannot call a React hook, so it cannot read the token out of context — and
 * `AuthContext` must not be the owner of the token either, or every request site would
 * need a component above it. So the token lives here, `apiClient` reads it synchronously
 * per request, and `AuthContext` mirrors it into React state via `subscribe`.
 *
 * ── Storage choice: `localStorage`, and what that costs ──────────────────────────────
 * The token is readable by any JavaScript running on this origin, so a single XSS bug
 * (a compromised npm dependency is the realistic one here) can exfiltrate it, and a
 * stateless JWT cannot be revoked server-side once it leaves. An httpOnly, SameSite
 * cookie would be immune to that read — but it is not available without a backend
 * change: `SecurityConfig.corsConfigurationSource` sets `allowCredentials(false)`, and
 * PLAN.md 2.4 chose header transport precisely to avoid re-enabling CSRF and the
 * multipart-filter risk on `/generate`. `sessionStorage` would narrow the window to one
 * tab but breaks the "a refresh must not log me out" requirement across tab restores,
 * and an in-memory-only token breaks it outright.
 *
 * What is done about it instead: the token is the only credential stored (never the
 * password), it carries a server-set expiry that is enforced here as well as by the
 * backend, and a 401 clears it everywhere (see `apiClient`).
 */

/**
 * Versioned so a future change to the stored shape can be ignored rather than
 * mis-parsed — `readSession` drops anything it does not recognise.
 */
const STORAGE_KEY = 'ghbli.auth.v1';

/**
 * In-memory mirror of the stored session. `apiClient.buildAuthHeaders` runs on every
 * request, and going to `localStorage` + `JSON.parse` each time would be a synchronous
 * disk-backed read per call for a value that only changes at login and logout.
 */
let cached = null;
let hydrated = false;

const listeners = new Set();

/**
 * Safari in private mode throws on `localStorage` access rather than returning null, and
 * `window` is absent under a non-jsdom test runner. Either way the app should still run,
 * just without persistence across a refresh.
 */
function storage() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Rejects anything that is not a session this build wrote. */
function isValidSession(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.token === 'string' &&
      value.token.length > 0 &&
      value.user &&
      typeof value.user === 'object',
  );
}

/**
 * A locally-known expiry, not a security control — the signature and `exp` are checked
 * by the backend, which is the only party that cannot be lied to. This exists so a
 * returning user with a day-old token sees the login page instead of a request that
 * fails and bounces them there.
 */
function isExpired(session) {
  return typeof session.expiresAt === 'number' && session.expiresAt <= Date.now();
}

function notify() {
  for (const listener of listeners) {
    listener(cached);
  }
}

function persist(session) {
  const store = storage();
  if (!store) {
    return;
  }

  try {
    if (session) {
      store.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      store.removeItem(STORAGE_KEY);
    }
  } catch {
    // Quota exceeded or a locked-down storage partition. The in-memory copy still
    // works for this page load; only "survives a refresh" is lost.
  }
}

function hydrate() {
  hydrated = true;

  const store = storage();
  if (!store) {
    return;
  }

  let parsed = null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!isValidSession(parsed) || isExpired(parsed)) {
    // Clear rather than leave it: a malformed or stale entry would otherwise be
    // re-parsed and re-rejected on every page load.
    if (parsed !== null) {
      persist(null);
    }
    cached = null;
    return;
  }

  cached = parsed;
}

/**
 * The stored session, or null. Synchronous by design: `AuthContext` restores from this
 * in a `useState` initialiser, so the very first render already knows whether there is a
 * user. Restoring in a `useEffect` instead would render one frame as anonymous, and
 * `ProtectedRoute` would redirect to /login on every refresh of /create.
 */
export function readSession() {
  if (!hydrated) {
    hydrate();
  }
  return cached;
}

/**
 * Why the last session ended, for the one case the user needs told: the server rejected
 * the token, rather than the user signing out.
 *
 * This deliberately does *not* travel in router state. Clearing the session is itself what
 * makes `ProtectedRoute` redirect, so a 401 on a protected page produces two navigations to
 * /login in the same React batch — the one from `AuthContext`'s handler, carrying the
 * reason, and ProtectedRoute's own, carrying only `from`. Whichever commits last wins, and
 * in practice ProtectedRoute's does, silently dropping the reason. A module flag is read by
 * whichever navigation lands.
 *
 * In memory on purpose: a reload should not resurface a notice about a session that ended
 * before it.
 */
let rejectedByServer = false;

/** Called by `apiClient` when a token-bearing request comes back 401. */
export function markSessionRejected() {
  rejectedByServer = true;
}

/** Non-destructive so it is safe to read during render, including a StrictMode re-render. */
export function peekSessionRejected() {
  return rejectedByServer;
}

export function clearSessionRejected() {
  rejectedByServer = false;
}

export function writeSession(session) {
  cached = isValidSession(session) ? session : null;
  hydrated = true;
  // A fresh sign-in makes any pending "your session ended" notice stale.
  rejectedByServer = false;
  persist(cached);
  notify();
}

export function clearSession() {
  if (cached === null && hydrated) {
    return;
  }
  cached = null;
  hydrated = true;
  persist(null);
  notify();
}

/** Read by `apiClient` on every authenticated request. */
export function getToken() {
  const session = readSession();
  if (!session || isExpired(session)) {
    return null;
  }
  return session.token;
}

/**
 * `tokenType` comes from the server (`AuthResponse.tokenType`, always "Bearer") rather
 * than being hardcoded here, per that DTO's own contract note. The fallback covers a
 * session written before this field existed.
 */
export function getAuthHeader() {
  const session = readSession();
  if (!session || isExpired(session)) {
    return {};
  }
  return { Authorization: `${session.tokenType || 'Bearer'} ${session.token}` };
}

/**
 * Maps the backend `AuthResponse` to a stored session. The single place that knows
 * `expiresIn` is in SECONDS relative to issue — not milliseconds, and not an absolute
 * timestamp. Getting that wrong by a factor of 1000 would expire every session about
 * 24 seconds after login while looking entirely plausible in code review.
 */
export function sessionFromAuthResponse(payload) {
  const expiresInSeconds = Number(payload?.expiresIn);

  return {
    token: payload?.token,
    tokenType: payload?.tokenType || 'Bearer',
    // null, not 0, when the server did not say: "unknown expiry" must mean "let the
    // backend decide", whereas 0 would mean "already expired" and lock the user out.
    expiresAt: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : null,
    user: {
      userId: payload?.userId,
      name: payload?.name,
      email: payload?.email,
      roles: Array.isArray(payload?.roles) ? payload.roles : [],
    },
  };
}

/**
 * Notifies on every mutation, including ones made by this tab, so the store stays the
 * single source of truth and `AuthContext` is a pure mirror of it.
 *
 * Also picks up the `storage` event, which fires only in *other* tabs — so logging out
 * in one tab logs out the rest instead of leaving them holding a cleared token and
 * discovering it on their next 401.
 *
 * @returns an unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);

  const onStorage = (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) {
      return;
    }
    // Force a re-read: another tab changed the durable copy, so the in-memory mirror
    // in this tab is stale by definition.
    hydrated = false;
    listener(readSession());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}
