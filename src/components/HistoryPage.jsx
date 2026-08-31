import { Link } from 'react-router-dom';
import useGenerationHistory from '../hooks/useGenerationHistory';
import useRevealOnScroll, { revealDelay } from '../hooks/useRevealOnScroll'; // The page had no motion at all
import Footer from './Footer';
import GenerationGrid from './GenerationGrid'; // Owns the card map, the lightbox state and the image queue
import GenerationSkeleton from './GenerationSkeleton';
import Header from './Header';

/**
 * The full history grid at `/history`, behind `ProtectedRoute`.
 *
 * Holds no image bytes and no object URLs itself — `useGenerationHistory` fetches metadata
 * only, and each `GenerationCard` owns the lifecycle of its own blob URL. This component's
 * only job is layout plus the four states the grid can be in: loading, error, empty, and
 * populated.
 *
 * Styling is the existing vocabulary: the card idiom
 * (`rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6`), the create-flow
 * primary gradient (`from-brand-700 to-amber-800` + `shadow-glow`), and the page shell from
 * `LoginPage`/`CreatePage`. No `brand-800` anywhere: it is used elsewhere in this codebase
 * but is not defined in `tailwind.config.js`, so it renders as nothing at all.
 *
 * The card map, `expandedId` and the delete-closes-the-lightbox rule now live in `GenerationGrid`,
 * which the homepage's recent strip renders too — see that file for why the image queue has to be
 * owned alongside them.
 */

/**
 * Named once because the loading state and the populated state must lay out identically — six
 * placeholders in different columns from the six cards replacing them is a visible jump.
 */
const HISTORY_GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function HistoryPage() {
  const {
    generations,
    page,
    totalElements,
    totalPages,
    isFirst,
    isLast,
    isLoading,
    isRefreshing,
    isEmpty,
    error,
    deleteError,
    deletingId,
    refresh,
    nextPage,
    previousPage,
    remove,
  } = useGenerationHistory();

  // Above the fold, so this fires on mount and the stagger doubles as the page's own entrance.
  const [headerRef, headerShown] = useRevealOnScroll();
  const [emptyRef, emptyShown] = useRevealOnScroll();

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div ref={headerRef} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                className={`text-2xl font-bold text-slate-900 motion-reduce:animate-none sm:text-3xl ${
                  headerShown ? `animate-rise-in ${revealDelay(0)}` : 'opacity-0'
                }`}
              >
                Your creations
              </h1>
              <p
                className={`mt-2 text-base text-slate-500 motion-reduce:animate-none ${
                  headerShown ? `animate-rise-in ${revealDelay(1)}` : 'opacity-0'
                }`}
              >
                {totalElements > 0
                  ? `${totalElements} generation${totalElements === 1 ? '' : 's'} saved to your account.`
                  : 'Every image you generate is saved here automatically.'}
                {/* A word that means "work is happening" should look like it — this was static text
                    that could sit there for a second and a half with nothing to distinguish it. */}
                {isRefreshing ? (
                  <span className="ml-2 animate-pulse text-sm text-slate-400 motion-reduce:animate-none">
                    Refreshing…
                  </span>
                ) : null}
              </p>
            </div>

            <Link
              to="/create"
              /* Third rung of the header stagger, and the site's hover pair instead of a bare
                 `transition-transform` at Tailwind's default 150ms `ease`. */
              className={`rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle motion-reduce:animate-none ${
                headerShown ? `animate-rise-in ${revealDelay(2)}` : 'opacity-0'
              }`}
            >
              Create new art
            </Link>
          </div>

          {deleteError ? (
            /* `panel-in` and not `rise-in`: 0.26s, because something that has just gone wrong has to
               be noticed, and 0.7s is a leisurely arrival for an error. */
            <p className="mt-6 animate-panel-in rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 motion-reduce:animate-none">
              {deleteError.message || 'Could not delete that generation. Please try again.'}
            </p>
          ) : null}

          {/* ── Error ─────────────────────────────────────────────────────────────────── */}
          {error ? (
            <div className="mt-8 animate-panel-in rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 motion-reduce:animate-none sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">We could not load your history</h2>
              <p className="mt-2 text-base text-slate-500">
                {/* The backend's ProblemDetail `detail`, parsed by apiClient. A network-level
                    failure has no status, so it falls back to a cause the user can act on. */}
                {error.status !== undefined && error.message
                  ? error.message
                  : 'Please check that the backend is running and try again.'}
              </p>
              <button
                type="button"
                onClick={refresh}
                className="mt-5 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle"
              >
                Try again
              </button>
            </div>
          ) : null}

          {/* ── Loading ───────────────────────────────────────────────────────────────── */}
          {isLoading && !error ? (
            /* Six placeholders shaped like the real card, so the grid does not jump when the rows
               land — now with the pulse staggered, because six in lockstep read as one machine. */
            <GenerationSkeleton count={6} className={`mt-8 ${HISTORY_GRID}`} />
          ) : null}

          {/* ── Empty ─────────────────────────────────────────────────────────────────── */}
          {isEmpty ? (
            <div
              ref={emptyRef}
              className={`mt-8 rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-stone-200 motion-reduce:animate-none sm:p-10 ${
                emptyShown ? 'animate-rise-in' : 'opacity-0'
              }`}
            >
              {/* `drift-slow` is the background-blob path, borrowed: on a 64px box its 3%/−4% and
                  1.06 scale work out to about a 2px float over 19s, which is exactly the amount of
                  life an empty state wants and costs no new keyframe. */}
              <div className="mx-auto flex h-16 w-16 animate-drift-slow items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-3xl text-slate-400 motion-reduce:animate-none">
                ✧
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900">No generations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-base text-slate-500">
                Turn a photo into Ghibli art, or describe a scene and let the model paint it.
                Everything you make shows up here.
              </p>
              <Link
                to="/create"
                className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle"
              >
                Create your first image
              </Link>
            </div>
          ) : null}

          {/* ── Populated ─────────────────────────────────────────────────────────────── */}
          {generations.length > 0 ? (
            <>
              {/* `key={page}` is what resets the image queue: paging remounts the grid, so `settled`
                  starts empty and page two cascades in reading order exactly like page one. Cards are
                  keyed by id inside — a delete shifts every later row forward, and an index key would
                  make React reuse a card for a different row, showing the previous row's image under
                  the new row's prompt until the fetch caught up. */}
              <GenerationGrid
                key={page}
                className={`mt-8 ${HISTORY_GRID}`}
                generations={generations}
                onDelete={remove}
                deletingId={deletingId}
              />

              {totalPages > 1 ? (
                // flex-wrap: Previous + "Page 1 of 9" + Next is ~330px, just over a 343px phone
                // column once the gap is counted, so the row needs somewhere to break.
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={previousPage}
                    disabled={isFirst || isRefreshing}
                    className={`rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition-colors duration-200 ${
                      isFirst || isRefreshing
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:border-brand-500 hover:text-brand-600'
                    }`}
                  >
                    Previous
                  </button>

                  <span className="text-base font-medium text-slate-500">
                    Page {page + 1} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={nextPage}
                    disabled={isLast || isRefreshing}
                    className={`rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition-colors duration-200 ${
                      isLast || isRefreshing
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:border-brand-500 hover:text-brand-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="mt-8 text-center text-sm text-slate-500">
            <Link
              to="/home"
              className="font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-600"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HistoryPage;
