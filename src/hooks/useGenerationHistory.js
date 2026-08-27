import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HISTORY_PAGE_SIZE,
  deleteGeneration,
  fetchGenerations,
} from '../services/apiClient';
import { subscribeToGenerations } from '../services/generationEvents';

/**
 * Owns everything about a page of generation history: the fetch, loading and error state,
 * pagination, and delete-with-refresh. Two very different surfaces consume it — the full
 * `/history` grid and the compact recent strip on `/create` — which is why it is a hook
 * and not state inside `HistoryPage`.
 *
 * It deliberately does NOT deal with image bytes. History rows carry no image, and each
 * card fetches (and revokes) its own blob URL, so this hook never holds an object URL and
 * therefore cannot leak one.
 *
 * Assumes there is a token: both call sites are behind `ProtectedRoute`. A 401 is still
 * handled correctly if the token expires mid-session — `apiClient` clears the session and
 * `AuthContext` navigates to /login — this hook just reports it as an error in the
 * meantime.
 *
 * @param size items per page; must be 1..100 or the backend answers 400
 */
export default function useGenerationHistory({ size = HISTORY_PAGE_SIZE } = {}) {
  const [page, setPage] = useState(0);
  const [generations, setGenerations] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  /**
   * Monotonic request id. The abort below already stops most overlap, but two fetches can
   * still be in flight across a page change plus an event-driven refresh — and without
   * this, a slow response for page 0 landing after a fast one for page 1 would render page
   * 0's rows while the pagination controls say page 1.
   */
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  /**
   * Bumped to force a refetch of the *same* page. `page` alone cannot express "load page 2
   * again", so a refresh after a delete or a new generation would be a no-op if the effect
   * depended only on it.
   */
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    // Cancel whatever is in flight. Beyond saving a wasted round trip, this is what makes
    // rapid pagination clicks resolve in a defined order rather than by network luck.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetching(true);
    setError(null);

    (async () => {
      try {
        const payload = await fetchGenerations({ page, size, signal: controller.signal });

        // A superseded request must not write state even if it somehow completed: the
        // abort above is best-effort, since a response already in the pipe still resolves.
        if (requestId !== requestIdRef.current) {
          return;
        }

        setGenerations(Array.isArray(payload?.content) ? payload.content : []);
        setPageInfo(payload ?? null);
        setHasLoaded(true);

        /*
         * Walk back a page when this one turned out to be empty and is not the first.
         * Reachable two ways: deleting the last row on the last page, and returning to a
         * deep page whose rows were removed in another tab. Without this the user is left
         * staring at an empty grid that claims to be page 3 of 2.
         */
        if (payload?.numberOfElements === 0 && page > 0) {
          setPage((current) => (current > 0 ? current - 1 : 0));
        }
      } catch (fetchError) {
        // An abort is not a failure — it is this effect cleaning up after itself. Showing
        // "the request was cancelled" for a page the user already navigated away from
        // would be a bug that looks like a server problem.
        if (controller.signal.aborted || fetchError?.name === 'AbortError') {
          return;
        }
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(fetchError);
        // Rows are cleared on failure on purpose: leaving the previous page's cards on
        // screen under an error banner would suggest they are still current.
        setGenerations([]);
        setPageInfo(null);
        setHasLoaded(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsFetching(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [page, size, reloadToken]);

  /**
   * A new generation refetches the current view, which is what makes a fresh image appear
   * in history with no manual refresh.
   *
   * Only while on page 0: the newest row is always at the top of the first page, so
   * refetching page 4 would cost a request and change nothing the user can see. `refresh`
   * is stable, so this subscribes once rather than on every render.
   */
  useEffect(() => {
    if (page !== 0) {
      return undefined;
    }
    return subscribeToGenerations(refresh);
  }, [page, refresh]);

  const goToPage = useCallback(
    (nextPage) => {
      const lastPage = Math.max((pageInfo?.totalPages ?? 1) - 1, 0);
      const clamped = Math.min(Math.max(nextPage, 0), lastPage);

      setPage((current) => (current === clamped ? current : clamped));
    },
    [pageInfo],
  );

  const nextPage = useCallback(() => {
    if (!pageInfo?.last) {
      setPage((current) => current + 1);
    }
  }, [pageInfo]);

  const previousPage = useCallback(() => {
    setPage((current) => Math.max(current - 1, 0));
  }, []);

  /**
   * Deletes one row, then reconciles the view.
   *
   * Not optimistic. An optimistic removal would have to be rolled back on failure, and the
   * only failure worth distinguishing (404 — someone else already deleted it) wants exactly
   * the same end state as success, so a refetch is both simpler and more truthful about
   * what the server now holds.
   */
  const remove = useCallback(
    async (id) => {
      if (!id || deletingId) {
        return false;
      }

      setDeletingId(id);
      setDeleteError(null);

      try {
        await deleteGeneration(id);
      } catch (removeError) {
        // 404 means it is already gone, which is the outcome the click asked for. Anything
        // else is a real failure and keeps the row on screen with a reason.
        if (removeError?.status !== 404) {
          setDeleteError(removeError);
          setDeletingId(null);
          return false;
        }
      }

      /*
       * Refetch rather than splice the row out locally, because deleting shifts every
       * later row forward by one — a local removal would leave a 12-item page showing 11
       * while item 13 stays invisible until the next navigation. When this was the only
       * row on a page past the first, step back instead; the effect's own empty-page guard
       * would catch it a request later, and this saves that round trip.
       */
      if (generations.length === 1 && page > 0) {
        setPage((current) => Math.max(current - 1, 0));
      } else {
        refresh();
      }

      setDeletingId(null);
      return true;
    },
    [deletingId, generations.length, page, refresh],
  );

  return useMemo(
    () => ({
      generations,
      page,
      size,
      totalElements: pageInfo?.totalElements ?? 0,
      totalPages: pageInfo?.totalPages ?? 0,
      isFirst: pageInfo?.first ?? page === 0,
      isLast: pageInfo?.last ?? true,

      /** First load, or a page change with nothing to show yet → render the skeleton. */
      isLoading: isFetching && generations.length === 0,
      /** A refetch under existing rows → a quiet indicator, not a blanked grid. */
      isRefreshing: isFetching && generations.length > 0,
      /** Distinguishes "no generations yet" from "not loaded yet", which look identical. */
      isEmpty: hasLoaded && !error && generations.length === 0,

      error,
      deleteError,
      deletingId,

      refresh,
      goToPage,
      nextPage,
      previousPage,
      remove,
    }),
    [
      generations,
      page,
      size,
      pageInfo,
      isFetching,
      hasLoaded,
      error,
      deleteError,
      deletingId,
      refresh,
      goToPage,
      nextPage,
      previousPage,
      remove,
    ],
  );
}
