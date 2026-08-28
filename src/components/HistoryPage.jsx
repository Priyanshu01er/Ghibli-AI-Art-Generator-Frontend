import { useState } from 'react';
import { Link } from 'react-router-dom';
import useGenerationHistory from '../hooks/useGenerationHistory';
import Footer from './Footer';
import GenerationCard from './GenerationCard';
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
 */
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

  /**
   * Which card's lightbox is open, held here rather than in the card so that only one can
   * ever be open. The card still owns the object URL the lightbox renders — it stays
   * mounted while expanded, so the URL cannot be revoked out from under the overlay.
   */
  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = async (id) => {
    // Close the lightbox first if it belongs to the row about to disappear.
    if (expandedId === id) {
      setExpandedId(null);
    }
    await remove(id);
  };

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your creations</h1>
              <p className="mt-2 text-base text-slate-500">
                {totalElements > 0
                  ? `${totalElements} generation${totalElements === 1 ? '' : 's'} saved to your account.`
                  : 'Every image you generate is saved here automatically.'}
                {isRefreshing ? <span className="ml-2 text-sm text-slate-400">Refreshing…</span> : null}
              </p>
            </div>

            <Link
              to="/create"
              className="rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
            >
              Create new art
            </Link>
          </div>

          {deleteError ? (
            <p className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {deleteError.message || 'Could not delete that generation. Please try again.'}
            </p>
          ) : null}

          {/* ── Error ─────────────────────────────────────────────────────────────────── */}
          {error ? (
            <div className="mt-8 rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6">
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
                className="mt-5 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Try again
              </button>
            </div>
          ) : null}

          {/* ── Loading ───────────────────────────────────────────────────────────────── */}
          {isLoading && !error ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Six placeholders shaped like the real card, so the grid does not jump when
                  the rows land. */}
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200"
                >
                  <div className="aspect-square animate-pulse bg-stone-200/70" />
                  <div className="p-4 sm:p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/80" />
                    <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-stone-200/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* ── Empty ─────────────────────────────────────────────────────────────────── */}
          {isEmpty ? (
            <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-stone-200 sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-3xl text-slate-400">
                ✧
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900">No generations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-base text-slate-500">
                Turn a photo into Ghibli art, or describe a scene and let the model paint it.
                Everything you make shows up here.
              </p>
              <Link
                to="/create"
                className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Create your first image
              </Link>
            </div>
          ) : null}

          {/* ── Populated ─────────────────────────────────────────────────────────────── */}
          {generations.length > 0 ? (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {generations.map((generation) => (
                  <GenerationCard
                    // Keyed by id, not index: a delete shifts every later row forward, and
                    // an index key would make React reuse a card for a different row —
                    // which here means showing the previous row's image under the new
                    // row's prompt until the fetch caught up.
                    key={generation.id}
                    generation={generation}
                    isExpanded={expandedId === generation.id}
                    onExpand={setExpandedId}
                    onCollapse={() => setExpandedId(null)}
                    onDelete={handleDelete}
                    isDeleting={deletingId === generation.id}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                // flex-wrap: Previous + "Page 1 of 9" + Next is ~330px, just over a 343px phone
                // column once the gap is counted, so the row needs somewhere to break.
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={previousPage}
                    disabled={isFirst || isRefreshing}
                    className={`rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition-colors ${
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
                    className={`rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition-colors ${
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
            <Link to="/home" className="font-semibold text-brand-700 hover:text-brand-600">
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
