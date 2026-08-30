import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveRedirect } from '../utils/authRedirect';
import useBackendWakeUp from '../hooks/useBackendWakeUp'; // Wake on mount + the slow-submit notice
import ColdStartNotice from './ColdStartNotice';
import Footer from './Footer';
import Header from './Header';

/**
 * Mirrors the backend `SignupRequest` constraints so the hint text cannot drift from the
 * rule that is actually enforced. The maximum is not cosmetic: BCrypt silently truncates
 * its input at 72 bytes, which is why the DTO caps it there rather than letting two
 * different long passwords with a shared prefix both authenticate.
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

function SignupPage() {
  const { isAuthenticated, signup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Same pair as LoginPage: one ping on mount, plus the notice once a submit runs long. The
  // timer lives in the hook, which is why this page still needs no useEffect of its own.
  const isWaking = useBackendWakeUp(isSubmitting);

  const redirectTo = resolveRedirect(location.state);
  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !isSubmitting;

  // Signup returns a usable token, so a new account is signed in immediately — no second
  // login round-trip. This also covers an already-signed-in user opening /signup.
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
    setErrorStatus(null);
    setFieldErrors({});

    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // 409 "An account with email <address> already exists" — raised both by the
      // pre-check and by the unique index losing a signup race, so it reads the same
      // either way. 400 carries the per-field `errors` map.
      setFormError(error?.message || 'Could not create your account. Please try again.');
      setErrorStatus(error?.status ?? null);
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
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Create your account</h1>
            <p className="mt-2 text-base text-slate-500">
              Sign up to start generating Ghibli art and keep every result.
            </p>

            <form onSubmit={handleSubmit} className="mt-6">
              <div>
                <label htmlFor="signup-name" className="mb-2 block text-lg font-semibold text-slate-800">
                  Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="Your name"
                  className={inputClass('name')}
                />
                {fieldErrors.name ? (
                  <p className="mt-2 text-sm font-medium text-red-600">Name {fieldErrors.name}</p>
                ) : null}
              </div>

              <div className="mt-4">
                <label htmlFor="signup-email" className="mb-2 block text-lg font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  placeholder="you@example.com"
                  className={inputClass('email')}
                />
                {fieldErrors.email ? (
                  <p className="mt-2 text-sm font-medium text-red-600">Email {fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="mt-4">
                <label htmlFor="signup-password" className="mb-2 block text-lg font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="At least 8 characters"
                  className={inputClass('password')}
                />
                {fieldErrors.password ? (
                  <p className="mt-2 text-sm font-medium text-red-600">Password {fieldErrors.password}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`mt-6 w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform ${
                  canSubmit ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>

              {/* Same placement as LoginPage, so the two forms behave identically when slow. */}
              {isWaking ? <ColdStartNotice /> : null}

              {formError ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-600">{formError}</p>
                  {errorStatus === 409 ? (
                    <p className="mt-1 text-sm text-slate-500">
                      <Link
                        to="/login"
                        state={location.state}
                        className="font-semibold text-brand-700 hover:text-brand-600"
                      >
                        Sign in instead
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                state={location.state}
                className="font-semibold text-brand-700 hover:text-brand-600"
              >
                Sign in
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

export default SignupPage;
