import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import Header from './Header';

/**
 * A real 404.
 *
 * Until now the catch-all route rendered HomePage, so every mistyped URL — /signin,
 * /register, /historyy — silently showed the landing page and looked like it had worked.
 * That is the exact failure PLAN.md 6.2 item 13 warns about, and it is worst for the auth
 * routes: someone told to "log in" who guesses /signin would see the homepage with no
 * indication they were on a route that does not exist.
 *
 * This is why App.jsx now lists the four scroll routes (/home, /features, /gallery, /faq)
 * explicitly. They only ever reached HomePage via the catch-all, so narrowing `*` to a 404
 * without naming them would have turned the entire nav into "page not found".
 */
function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto flex max-w-7xl justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 text-center shadow-card ring-1 ring-stone-200 sm:p-6">
            <p className="font-heading text-5xl font-bold text-brand-700">404</p>
            <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Page not found</h1>
            <p className="mt-2 text-base text-slate-500">
              That address does not exist. Check the spelling, or pick a page below.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/home"
                className="w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Back to Home
              </Link>

              {isAuthenticated ? (
                <Link
                  to="/create"
                  className="w-full rounded-xl bg-stone-200 px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-stone-300"
                >
                  Go to Create
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full rounded-xl bg-stone-200 px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-stone-300"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default NotFoundPage;
