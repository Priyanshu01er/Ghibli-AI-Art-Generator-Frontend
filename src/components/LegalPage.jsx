import { Link, useLocation } from 'react-router-dom';
import legalHeroArt from '../assets/L1.png'; // The three assets added for this page
import termsArt from '../assets/L2.webp';
import privacyArt from '../assets/L3.webp';
import {
  legalUpdatedAt,
  privacyClauses,
  privacyNeverStored,
  privacyStored,
  termsClauses,
} from '../data/legalData';
import Footer from './Footer';
import Header from './Header';

/**
 * The page behind the two footer links that used to point at /home.
 *
 * Three routes render this one file — /legal, /terms and /privacy all open at the top of the
 * page (App.jsx's SCROLL_TO_TOP_ROUTES resets the scroll for each); the hero's pill buttons and
 * the footer links still jump to a half when you are already on the page. Public on purpose: a
 * policy you have to sign up to read is not a policy.
 *
 * The copy lives in `data/legalData.js`, next to `homeData.js`, so this file stays layout.
 */

/** The same route→section map, with the same offsets, that Header and Footer already share. */
const routeMap = {
  '/terms': { sectionId: 'terms', offset: 16 },
  '/privacy': { sectionId: 'privacy', offset: 16 },
};

function scrollToSection(pathname) {
  const routeConfig = routeMap[pathname];
  if (!routeConfig) {
    return; // /legal — App.jsx already lists it in SCROLL_TO_TOP_ROUTES.
  }

  const section = document.getElementById(routeConfig.sectionId);
  if (!section) {
    return;
  }

  const y = section.getBoundingClientRect().top + window.scrollY - routeConfig.offset;
  window.scrollTo({ top: Math.max(y, 0), left: 0, behavior: 'smooth' });
}

/** Numbered clause card. Both halves render the same shape from their own array. */
function ClauseList({ clauses }) {
  return (
    <ol className="mt-8 space-y-4">
      {clauses.map((clause, index) => (
        <li
          key={clause.title}
          className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-glow">
              {index + 1}
            </span>
            <div>
              <h3 className="font-heading text-xl font-semibold text-slate-900">{clause.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{clause.body}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One half of the store / never-store contrast block. */
function StorageColumn({ title, items, tone }) {
  const isKept = tone === 'kept'; // Warm brand card for what we hold, quiet card for what we do not
  return (
    <div
      className={`rounded-3xl p-5 shadow-card ring-1 sm:p-6 ${
        isKept ? 'bg-brand-50 ring-brand-100' : 'bg-white ring-stone-200'
      }`}
    >
      <h3 className="font-heading text-xl font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-base text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 text-lg font-bold ${isKept ? 'text-brand-600' : 'text-slate-400'}`}
            >
              {isKept ? '✓' : '✕'}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegalPage() {
  const { pathname } = useLocation();

  // No mount-time auto-scroll: /terms and /privacy now open at the top of the page like /legal.
  // (This effect used to smooth-scroll straight to the "Part one"/"Part two" section, which hid
  // the hero.) Same-page jumps still work — the footer and the hero pills call scrollToSection
  // directly from their click handlers below.

  /**
   * Clicking the pill for the half you are already on does not change `pathname`, so this
   * scroll is what lands you on that half — the same behavior the footer links rely on.
   */
  const handleJumpClick = (event, href) => {
    if (pathname !== href) {
      return;
    }

    event.preventDefault();
    scrollToSection(href);
  };

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        {/* Hero band: L1.png full-bleed behind a scrim dark enough for white text at AA. */}
        <section className="relative isolate overflow-hidden">
          <img
            src={legalHeroArt}
            alt="" // Decorative: the heading below carries the meaning
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-brand-900/85 via-brand-900/65 to-slate-900/80"
          />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-100">
              Ghibli AI · Legal
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold text-white sm:text-5xl">
              The short, honest version
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-100/90">
              Two halves: what you agree to when you use the generator, and exactly what is kept
              when you do. Written from what this project&apos;s code actually does — so if a line
              here is wrong, it is a bug, not small print.
            </p>
            <p className="mt-3 text-sm text-stone-200/80">Last updated {legalUpdatedAt}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/terms"
                onClick={(event) => handleJumpClick(event, '/terms')}
                className="rounded-full bg-white px-5 py-2.5 text-base font-semibold text-brand-700 shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                onClick={(event) => handleJumpClick(event, '/privacy')}
                className="rounded-full border border-white/70 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-white/15"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </section>

        {/* First half. scroll-mt-24 clears the sticky header for a native anchor jump. */}
        <section id="terms" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                Part one
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
                Terms of Service
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Eight clauses. They cover what the service is, what you may put into it, who owns
                what comes out, and the two things people most often assume wrongly: that this site
                is connected to Studio Ghibli, and that a generated image is stored somewhere safe
                forever. Neither is true.
              </p>
            </div>

            <figure className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200">
              <img
                src={termsArt}
                alt="Ghibli-style painted landscape"
                className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-80"
              />
            </figure>
          </div>

          <ClauseList clauses={termsClauses} />
        </section>

        {/* Second half. Image first on large screens so the two halves do not mirror. */}
        <section
          id="privacy"
          className="mx-auto max-w-7xl scroll-mt-24 border-t border-stone-200/80 px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <figure className="order-last overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200 lg:order-first">
              <img
                src={privacyArt}
                alt="Ghibli-style quiet interior scene"
                className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-80"
              />
            </figure>

            <div>
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                Part two
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
                Privacy Policy
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Every field named below was read off this project&apos;s own database models, so the
                list is what exists rather than what is customary. The headline: the photo you
                upload is never saved — only the artwork that comes back is.
              </p>
            </div>
          </div>

          {/* The contrast block: the fastest honest answer to "what do you keep about me?" */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <StorageColumn title="What is stored" items={privacyStored} tone="kept" />
            <StorageColumn title="What is never stored" items={privacyNeverStored} tone="never" />
          </div>

          <ClauseList clauses={privacyClauses} />
        </section>

        {/* Closing card — the same two-button idiom NotFoundPage and CtaSection already use. */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-stone-200 sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
              That is all of it
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
              No clause hidden in a linked PDF, and nothing here you have to accept twice. Go and
              make something.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/create"
                className="rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Create Ghibli art
              </Link>
              <Link
                to="/home"
                className="rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-lg font-semibold text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default LegalPage;
