import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearSessionRejected, peekSessionRejected } from '../services/authStorage';
import { resolveRedirect } from '../utils/authRedirect';
import useBackendWakeUp from '../hooks/useBackendWakeUp'; // Wake on mount + the slow-submit notice
import ColdStartNotice from './ColdStartNotice';
import Footer from './Footer';
import Header from './Header';

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Latched on first render rather than read live, so the notice survives the re-renders
   * that follow and disappears only on the next navigation here. `peek` does not mutate,
   * which keeps this safe to call from an initialiser that StrictMode runs twice.
   */
  const [sessionExpired] = useState(() => peekSessionRejected());

  // Pings /actuator/health on mount, and reports back once a submit has been running long
  // enough to be worth explaining. Taking `isSubmitting` as input keeps handleSubmit untouched.
  const isWaking = useBackendWakeUp(isSubmitting);

  const redirectTo = resolveRedirect(location.state);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  // Consumed once shown: arriving at /login again later — by choice, or after signing out —
  // should not repeat it.
  useEffect(() => {
    clearSessionRejected();
  }, []);

  // Handles both orderings after a successful submit (state landing before or after the
  // navigate below) and the plain case of an already-signed-in user opening /login.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // 401 here is "Incorrect email or password." straight from the backend, which
      // hides on purpose whether the address exists at all — so there is nothing more
      // specific to show, and inventing something would leak more than the API does.
      // 400 carries a per-field `errors` map from GlobalExceptionHandler.
      setFormError(error?.message || 'Could not sign you in. Please try again.');
      setFieldErrors(error?.errors || {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-700 outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[0_0_0_3px_rgba(180,83,9,0.12)] ${
      fieldErrors[field] ? 'border-red-400' : 'border-stone-300'
    }`;

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome back</h1>
            <p className="mt-2 text-base text-slate-500">
              Sign in to generate Ghibli art and keep your history.
            </p>

            {sessionExpired ? (
              <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Your session ended. Please sign in again to continue.
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-lg font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClass('email')}
                />
                {fieldErrors.email ? (
                  <p className="mt-2 text-sm font-medium text-red-600">Email {fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="mt-4">
                <label htmlFor="login-password" className="mb-2 block text-lg font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Your password"
                  className={inputClass('password')}
                />
                {fieldErrors.password ? (
                  <p className="mt-2 text-sm font-medium text-red-600">Password {fieldErrors.password}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`mt-6 w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform ${
                  canSubmit ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              {/* Below the button, where the eye already is after clicking it. Mutually
                  exclusive with formError in practice: this only shows while submitting. */}
              {isWaking ? <ColdStartNotice /> : null}

              {formError ? <p className="mt-3 text-sm font-medium text-red-600">{formError}</p> : null}
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              New here?{' '}
              <Link
                to="/signup"
                state={location.state}
                className="font-semibold text-brand-700 hover:text-brand-600"
              >
                Create an account
              </Link>
            </p>

            <p className="mt-2 text-center text-sm text-slate-500">
              <Link to="/home" className="font-semibold text-brand-700 hover:text-brand-600">
                Back to Home
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default LoginPage;
