import { useState } from 'react';
import { Link } from 'react-router-dom';
import useGenerationHistory from '../hooks/useGenerationHistory';
import GenerationCard from './GenerationCard';

/** One row at every breakpoint the grid below uses. */
const RECENT_SIZE = 4;

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

  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    }
    await remove(id);
  };

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
          {isRefreshing ? <span className="ml-2 text-sm font-medium text-slate-400">Updating…</span> : null}
        </h2>

        {totalElements > RECENT_SIZE ? (
          <Link to="/history" className="text-base font-semibold text-brand-700 hover:text-brand-600">
            View all {totalElements} →
          </Link>
        ) : (
          <Link to="/history" className="text-base font-semibold text-brand-700 hover:text-brand-600">
            View history →
          </Link>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Saved to your account, so they are still here after a tab switch or a page reload.
      </p>

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600">
          Your recent creations could not be loaded, but generating still works.{' '}
          <Link to="/history" className="font-semibold underline">
            Open history
          </Link>
        </p>
      ) : null}

      {isLoading && !error ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: RECENT_SIZE }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200">
              <div className="aspect-square animate-pulse bg-stone-200/70" />
              <div className="p-4 sm:p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/80" />
                <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-stone-200/60" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {generations.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {generations.map((generation) => (
            <GenerationCard
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
      ) : null}
    </section>
  );
}

export default RecentGenerations;
