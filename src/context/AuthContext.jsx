import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  login as loginRequest,
  setUnauthorizedHandler,
  signup as signupRequest,
} from '../services/apiClient';
import {
  clearSession,
  clearSessionRejected,
  readSession,
  sessionFromAuthResponse,
  subscribe,
  writeSession,
} from '../services/authStorage';
import { clearAllDrafts } from '../services/generationDraftStore'; // Drafts are session-scoped

/**
 * Auth state for the whole app: who is signed in, and the three verbs that change it.
 *
 * The token itself is owned by `services/authStorage`, not by this provider — see the
 * comment at the top of that file for why, and for the XSS tradeoff of storing it in
 * `localStorage`. This component is a mirror of that store plus the navigation side
 * effects that only something inside the router can perform.
 *
 * Must be rendered *inside* `BrowserRouter`: it calls `useNavigate` so that a 401 can
 * bounce the user to the login page through the router rather than by reloading the
 * document.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  /**
   * Restored synchronously in the initialiser, not in an effect. With an effect the first
   * render would be anonymous, and `ProtectedRoute` would redirect to /login on every
   * refresh of /create before the token was ever read — the classic "login does not
   * survive F5" bug, with the token sitting in storage the whole time.
   */
  const [session, setSession] = useState(() => readSession());
  const navigate = useNavigate();

  // The store notifies on its own mutations and on the cross-tab `storage` event, so
  // this covers both "this tab logged out" and "another tab logged out".
  useEffect(() => subscribe(setSession), []);

  /**
   * What `apiClient` calls when a token-bearing request comes back 401. The store has
   * already been cleared by then; this only has to move the user.
   *
   * `from` is read off `window.location` rather than `useLocation`, because this fires
   * from a fetch continuation and needs wherever the user actually is at that moment,
   * not whatever location was captured when the handler was registered. The shape
   * matches what `ProtectedRoute` passes, so `LoginPage` reads one thing.
   *
   * The *reason* is not passed here, only the destination: clearing the session already
   * makes `ProtectedRoute` redirect too, and its `Navigate` state overwrites this one. See
   * `markSessionRejected` in `authStorage` for where the reason lives instead.
   */
  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        navigate('/login', {
          replace: true,
          state: {
            from: { pathname: window.location.pathname, search: window.location.search },
          },
        });
      }),
    [navigate],
  );

  /**
   * Both of these let the `ApiError` propagate. The page needs the status and the
   * per-field `errors` map to render a 409 differently from a 400, and swallowing it
   * here would mean re-inventing that signal as a return value.
   */
  const login = useCallback(async (credentials) => {
    const payload = await loginRequest(credentials);
    const next = sessionFromAuthResponse(payload);
    // Writing to the store is what updates React state — the subscription above fires
    // synchronously — so there is one code path, not a store write plus a setState that
    // could drift apart.
    writeSession(next);
    return next.user;
  }, []);

  const signup = useCallback(async (details) => {
    const payload = await signupRequest(details);
    const next = sessionFromAuthResponse(payload);
    writeSession(next);
    return next.user;
  }, []);

  /**
   * Purely local: there is no server-side logout to call. A stateless JWT stays valid
   * until it expires, which is the tradeoff PLAN.md names — real revocation would need a
   * denylist or short-lived tokens plus refresh.
   */
  const logout = useCallback(() => {
    // Order matters only for the flag: signing out deliberately must not show the
    // "your session ended" notice meant for a server-rejected token.
    clearSessionRejected();
    clearSession();
    // The second half of "kept until Create Another or logout": megabytes of generated art
    // must not be left in localStorage for whoever uses this browser next.
    clearAllDrafts();
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      signup,
      logout,
    }),
    [session, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  // Throwing beats returning a null-ish default: a component rendered outside the
  // provider would otherwise read `isAuthenticated: false` and silently behave as if the
  // user were signed out.
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
