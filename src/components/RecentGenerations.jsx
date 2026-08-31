import { Link } from 'react-router-dom';
import useGenerationHistory from '../hooks/useGenerationHistory';
import GenerationGrid from './GenerationGrid'; // Was a private copy of the history page's grid
import GenerationSkeleton from './GenerationSkeleton';

/** One row at every breakpoint the grid below uses. */
const RECENT_SIZE = 4;

/** Four across on large screens, so this strip is one row rather than the history page's three. */
const RECENT_GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4';

/**
 * The newest few generations, shown under the create form.
 *
 * This is what makes the "results persist across navigation" claim true rather than
 * incidental. `CreatePage` swaps `PhotoToArtSection` for `TextToArtSection` on a tab click,
 * which unmounts the old one and takes its in-memory blob with it — so before this existed,
 * switching tabs (or leaving the page and coming back) silently discarded a generation the
 * user had just waited for. This component renders *outside* that swap and reads from the
 * server, so the result outlives both the tab switch and the navigation.
 *
 * It stays current without a manual refresh because `useGenerationHistory` subscribes to the
 * generation event that `apiClient` publishes after a successful POST — and the backend
 * commits the history row synchronously, before the PNG is written to the response, so the
 * refetch is not racing the write.
 *
 * Failure here is deliberately quiet: one line of text, not the panel `HistoryPage` shows.
 * The job of this page is generating art, and a history fetch that failed must not look like
 * the generator is broken.
 *
 * The grid itself is `GenerationGrid`, shared with `HistoryPage`. Because that component carries the
 * reveal observer, this strip — which sits below the fold — now also defers all four of its
 * authenticated image fetches until you actually scroll down to it.
 */
function RecentGenerations() {
  const {
    generations,
    totalElements,
    isLoading,
    isRefreshing,
    isEmpty,
    error,
    deletingId,
    remove,
  } = useGenerationHistory({ size: RECENT_SIZE });

  // Nothing to say before the first generation — the form above already is the call to
  // action, and an empty panel here would just push it up the page.
  if (isEmpty && !error) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Recent creations
          {/* Same as the history page's "Refreshing…": a word about work in progress should move. */}
          {isRefreshing ? (
            <span className="ml-2 animate-pulse text-sm font-medium text-slate-400 motion-reduce:animate-none">
              Updating…
            </span>
          ) : null}
        </h2>

        {totalElements > RECENT_SIZE ? (
          <Link
            to="/history"
            className="text-base font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-600"
          >
            View all {totalElements} →
          </Link>
        ) : (
          <Link
            to="/history"
            className="text-base font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-600"
          >
            View history →
          </Link>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Saved to your account, so they are still here after a tab switch or a page reload.
      </p>

      {error ? (
        <p className="mt-4 animate-soft-in text-sm font-medium text-red-600 motion-reduce:animate-none">
          Your recent creations could not be loaded, but generating still works.{' '}
          <Link to="/history" className="font-semibold underline">
            Open history
          </Link>
        </p>
      ) : null}

      {isLoading && !error ? (
        <GenerationSkeleton count={RECENT_SIZE} className={`mt-4 ${RECENT_GRID}`} />
      ) : null}

      {generations.length > 0 ? (
        /* No `key` here, unlike the history page's `key={page}`: this strip has no pagination, and a
           new generation prepending a row must not restart the queue for the three below it. */
        <GenerationGrid
          className={`mt-4 ${RECENT_GRID}`}
          generations={generations}
          onDelete={remove}
          deletingId={deletingId}
        />
      ) : null}
    </section>
  );
}

export default RecentGenerations;
