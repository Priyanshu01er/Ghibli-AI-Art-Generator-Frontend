/**
 * Where to send a user once they are signed in.
 *
 * Shared by LoginPage and SignupPage so the two cannot drift — a signup that ignored
 * `state.from` would drop anyone who arrived at the guarded /create route and chose to
 * register instead of log in.
 *
 * Reads two shapes, both spelled `state.from`: the real router Location that
 * `ProtectedRoute` passes, and the `{ pathname, search }` stand-in that the 401 handler in
 * `AuthProvider` builds from `window.location`.
 */
export const DEFAULT_AUTH_REDIRECT = '/create';

export function resolveRedirect(state) {
  const pathname = state?.from?.pathname;

  // Without the /login and /signup guard, a 401 raised while sitting on an auth page
  // would make that page its own redirect target, and the user would appear to sign in
  // successfully and go nowhere.
  if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return `${pathname}${state.from.search || ''}`;
}
