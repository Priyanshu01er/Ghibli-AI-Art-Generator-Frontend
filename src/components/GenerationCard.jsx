import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // The lightbox mounts on <body> — see the portal note at the JSX below
import { fetchGenerationImage } from '../services/apiClient';
import prefersReducedMotion from '../utils/motionPreference'; // Skip the lightbox exit, don't stall on it
import {
  downloadFilename,
  formatBytes,
  formatCreatedAt,
  styleLabel,
  typeLabel,
} from '../utils/generationLabels';

/**
 * One history entry: its image, its metadata, and the download / delete actions. The image is
 * itself the full-size trigger, which is why there is no separate View button.
 *
 * ── Why this component fetches its own image ─────────────────────────────────────────────
 * `GET /api/v1/generations/{id}/image` requires an `Authorization` header, and the browser's
 * image loader sends none — so `<img src={apiUrl}>` 401s with nothing in the console to
 * explain why, and the network tab shows a request the app never appears to have made. The
 * bytes have to come through `fetch` (which does carry the header, via `apiClient`) and be
 * handed to the `<img>` as a blob URL.
 *
 * ── Why the object URL lives in this effect and not in state ─────────────────────────────
 * `TextToArtSection` holds one URL in state and revokes it in a `[generatedImage]` effect,
 * which is right for a single image on a page that owns it. A grid is the case that pattern
 * does not survive: N cards mount and unmount as pages change and rows are deleted, and
 * reconciling a collection of URLs against a collection of rows is exactly where the leak
 * gets in. So the same discipline is applied one level down — each card owns exactly one
 * URL, created inside the effect and closed over by that effect's own cleanup:
 *
 *   - The URL is created *inside* the effect, so cleanup revokes the precise string that
 *     run created. No stale-state read, no dependency on render order.
 *   - `cancelled` is checked *before* `createObjectURL`, so a fetch that resolves after
 *     unmount never creates a URL at all — the leak a post-unmount `setState` guard alone
 *     would not prevent, because the URL would already exist by then.
 *   - The fetch is aborted on unmount, so navigating away mid-load costs neither the
 *     transfer nor a URL.
 *   - An `id` change re-runs the effect, and cleanup revokes the previous URL before the
 *     new one is created — the same "revoke before replace" rule, enforced by React rather
 *     than remembered at each call site.
 *   - Under StrictMode's double-invoke, run 1's cleanup revokes run 1's URL and run 2
 *     creates its own. Nothing is double-revoked (which is harmless anyway) and nothing is
 *     orphaned.
 *
 * The download reuses this same URL rather than fetching the bytes again, so there is never
 * a second URL in flight per card.
 *
 * ── Why the fetch waits its turn ─────────────────────────────────────────────────────────
 * Because it is a `fetch` and not an `<img src>`, nothing throttled it: twelve mounted cards
 * opened twelve authenticated requests at once and the grid then filled in *byte* order, the
 * same 1, 3, 4, 2 assembly the homepage's `useImageQueue` was written to fix. So `GenerationGrid`
 * owns one queue and hands each card its slot; the card asks it two questions — may I request
 * yet, and may I show yet — and tells it when its bytes have landed.
 */

/**
 * The answer for a card rendered without a grid around it: request immediately, show immediately.
 * A default object rather than a `queue ? … : …` at every use, so the fail-open path is one thing
 * that exists rather than three conditionals that have to agree.
 */
const OPEN_QUEUE = {
  canLoad: () => true,
  isVisible: () => true,
  reportSettled: () => {},
};

/**
 * How long the closing lightbox stays mounted — must equal `panel-out`'s duration in
 * `tailwind.config.js`. `GallerySection.jsx` holds the site's other lightbox and its own copy of this
 * constant; two literals cross-referenced beats a shared module that would exist for one number.
 */
const LIGHTBOX_EXIT_MS = 200;

function GenerationCard({
  generation,
  isRevealed = true, // The grid's reveal flag; `true` alone so the card still renders in isolation
  revealDelayClass = '', // A static delay class from `revealDelay()`, never a template literal
  queue = OPEN_QUEUE,
  queueIndex = 0,
  isExpanded = false,
  onExpand,
  onCollapse,
  onDelete,
  isDeleting = false,
}) {
  const { canLoad, isVisible, reportSettled } = queue;
  const { id } = generation;
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // Lightbox is playing its exit, not yet unmounted

  /**
   * Read into a boolean here rather than called from inside the effect below, and this is the whole
   * trick: `canLoad`'s identity changes every time *any* card in the grid settles, so passing the
   * function as a dependency would abort and restart all twelve fetches on each arrival. The boolean
   * it returns only ever flips once, false → true.
   */
  const mayLoad = canLoad(queueIndex);

  useEffect(() => {
    if (!mayLoad) {
      return undefined; // Still behind the head of the queue — no request, no state to clear
    }

    let objectUrl = null;
    let cancelled = false;
    const controller = new AbortController();

    setImageUrl('');
    setImageError('');

    (async () => {
      try {
        const blob = await fetchGenerationImage(id, { signal: controller.signal });

        // Before createObjectURL, not after: this is the check that means an unmount
        // during the fetch leaves nothing behind to revoke.
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (error) {
        if (cancelled || controller.signal.aborted || error?.name === 'AbortError') {
          return;
        }

        // 404 is the honest case: the row was deleted in another tab between the list
        // response and this request. A 401 has already cleared the session by now and
        // `AuthContext` is navigating away, so the message below is never seen for it.
        setImageError(
          error?.status === 404
            ? 'This image is no longer available.'
            : 'Could not load this image.',
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };
  }, [id, mayLoad]);

  /**
   * Tells the queue this slot is done, so the card behind it may request and the card in front of it
   * may show. An error counts as settled — the same rule `useImageLoaded` uses — because a 404 that
   * never reported would stall every card below it forever.
   *
   * Its own effect, keyed on `queueIndex`, rather than a `finally` inside the fetch: deleting a row
   * shifts every card beneath it up a slot, and the queue's ordering guarantee is literally
   * `settled.has(revealed)`, so a card that already holds its bytes has to re-report under its new
   * index or the queue wedges on a slot nobody will ever fill. `reportSettled` is idempotent, so the
   * re-report costs a bail-out rather than a render.
   */
  const isSettled = Boolean(imageUrl) || Boolean(imageError);

  useEffect(() => {
    if (isSettled) {
      reportSettled(queueIndex);
    }
  }, [isSettled, queueIndex, reportSettled]);

  /**
   * Asks the lightbox to leave. The panel is not unmounted here — it keeps rendering for one
   * `panel-out` while `isClosing` is set, and only then is the parent told to drop `expandedId`.
   * Reduced motion skips straight to the end: someone who asked for less movement should not also
   * be made to wait 200ms for movement they are not getting.
   */
  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) {
      onCollapse?.();
      return;
    }

    setIsClosing(true);
  }, [onCollapse]);

  useEffect(() => {
    if (!isClosing) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsClosing(false);
      onCollapse?.();
    }, LIGHTBOX_EXIT_MS);

    return () => clearTimeout(timer);
    // `onCollapse` must be a stable reference — `GenerationGrid` wraps it in `useCallback` for exactly
    // this effect, because a fresh identity each render would clear and restart the timer forever.
  }, [isClosing, onCollapse]);

  // Closed from outside — the open row was deleted — so there is nothing left to play an exit on.
  useEffect(() => {
    if (!isExpanded) {
      setIsClosing(false);
    }
  }, [isExpanded]);

  /**
   * Escape closes the lightbox. Bound only while it is open, so the app is not carrying a
   * document-level key listener per card in the grid.
   */
  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestClose(); // Same exit as the backdrop and the Close button, not an instant unmount
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isExpanded, requestClose]);

  /**
   * Same approach as `TextToArtSection.handleDownload` — an anchor with `download`, pointed
   * at the blob URL already held for display. No second fetch, and no second object URL to
   * revoke.
   */
  const handleDownload = () => {
    if (!imageUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = downloadFilename(generation);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setIsConfirmingDelete(false);
    // The parent removes the row, which unmounts this card and revokes its URL through the
    // effect cleanup above. Nothing to clean up here.
    onDelete?.(id);
  };

  const createdAt = formatCreatedAt(generation.createdAt);
  const style = styleLabel(generation.style, generation.type);
  const sizeLabel = formatBytes(generation.imageSizeBytes);
  const dimensions =
    generation.width && generation.height ? `${generation.width}×${generation.height}` : null;
  const canPreview = Boolean(imageUrl);
  /**
   * Both halves of the queue's promise in one boolean: the bytes are here *and* every card ahead of
   * this one is already showing. The conjunction is what makes a shifting row set harmless — after a
   * delete or a new generation each slot index moves by one, and a card that finds itself below
   * `revealed` before its bytes land keeps its placeholder instead of flashing an empty frame.
   *
   * It gates the whole button, not just the image's opacity: a picture faded to zero inside a
   * `cursor-zoom-in` button would still open a lightbox on an image nobody can see.
   */
  const isShowing = canPreview && isVisible(queueIndex);

  return (
    <article
      /* Arrives with the grid rather than with its picture, so the layout is there immediately and
         only the artwork inside it waits its turn. The lift is the site's fast-in/slow-out pair, and
         it works at all only because `rise-in` fills `backwards` — a `forwards` fill would leave a
         transform on the element that outranks every `hover:` for the rest of the session. */
      className={`flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200 transition-all duration-500 ease-exit hover:-translate-y-1 hover:shadow-glow hover:duration-200 hover:ease-settle motion-reduce:animate-none ${
        isDeleting ? 'scale-[0.97] opacity-50' : '' // A row on its way out, rather than one that blinks
      } ${isRevealed ? `animate-rise-in ${revealDelayClass}` : 'opacity-0'}`}
    >
      <div className="relative aspect-square bg-stone-50/80">
        {isShowing ? (
          <button
            type="button"
            onClick={() => onExpand?.(id)}
            className="group block h-full w-full cursor-zoom-in"
            title="View full size"
          >
            <img
              src={imageUrl}
              alt={generation.prompt || 'Generated Ghibli art'}
              /* `develop-in` unconditionally: this element only mounts once `isShowing` is true, so
                 the animation plays on its first frame and needs no class flip. Safe alongside the
                 zoom because it touches `opacity` and `filter` and never `transform`. The zoom itself
                 was 300ms in *and* out with no easing named; now 300ms in, 700ms back. */
              className="h-full w-full animate-develop-in object-cover transition-transform duration-700 ease-exit group-hover:scale-[1.03] group-hover:duration-300 group-hover:ease-entrance motion-reduce:animate-none"
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            {imageError ? (
              <p className="animate-soft-in text-sm font-medium text-red-600 motion-reduce:animate-none">
                {imageError}
              </p>
            ) : (
              <div className="h-full w-full animate-pulse rounded-none bg-stone-200/70 motion-reduce:animate-none" />
            )}
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
          {typeLabel(generation.type)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* line-clamp-2 is core in Tailwind 3.4 (moved out of the plugin in 3.3), so no
            plugin registration is needed. The full prompt stays in the title attribute. */}
        <p
          className="line-clamp-2 text-base font-semibold leading-tight text-slate-900"
          title={generation.prompt}
        >
          {generation.prompt || 'Untitled generation'}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          {style ? <span className="font-medium text-slate-600">{style}</span> : null}
          {style && createdAt ? <span aria-hidden="true">·</span> : null}
          {createdAt ? <time dateTime={generation.createdAt}>{createdAt}</time> : null}
        </div>

        {dimensions || sizeLabel ? (
          <p className="mt-1 text-xs text-slate-400">
            {[dimensions, sizeLabel].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {/* justify-between, and Download without flex-1: Download sits hard left and Delete
            hard right, which is what the removed View button used to sit between. */}
        <div className="mt-4 flex flex-1 items-end justify-between gap-2">
          {/* The View button that used to lead this row is gone — it fired the same
              `onExpand(id)` the image itself already fires, so it cost a third of the row
              for nothing. Full-size view is unchanged: click the image. */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canPreview}
            /* The pair the rest of the site runs: 300ms `ease-exit` on the way back, 200ms
               `ease-settle` on the way in. This had a bare `transition-transform`, so it answered at
               Tailwind's default 150ms `ease` in both directions. */
            className={`rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform duration-300 ease-exit ${
              canPreview
                ? 'hover:-translate-y-0.5 hover:duration-200 hover:ease-settle'
                : 'cursor-not-allowed opacity-60'
            }`}
          >
            Download
          </button>

          <button
            type="button"
            onClick={handleDeleteClick}
            onBlur={() => setIsConfirmingDelete(false)}
            disabled={isDeleting}
            title={isConfirmingDelete ? 'Click again to delete permanently' : 'Delete'}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
              isConfirmingDelete
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-stone-300 bg-white text-slate-500 hover:border-red-400 hover:text-red-600'
            } ${isDeleting ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {/* Two-step rather than window.confirm: a native dialog blocks the whole tab
                and cannot be styled, and this is a reversible-by-regenerating action, not
                a destructive one worth a modal. */}
            {/* Keyed so React remounts the label and the new word crossfades in with the red. The key
                is on this span and not on the button on purpose: remounting the button would move
                focus, and losing focus fires the `onBlur` above and cancels the confirmation. */}
            <span
              key={isDeleting ? 'deleting' : isConfirmingDelete ? 'confirming' : 'idle'}
              className="animate-fade-in motion-reduce:animate-none"
            >
              {isDeleting ? '…' : isConfirmingDelete ? 'Sure?' : 'Delete'}
            </span>
          </button>
        </div>
      </div>

      {/* The lightbox is a portal, and that is a bug fix rather than a style choice. A
          "position: fixed" box is positioned against the nearest ancestor that carries a
          transform — and this card lifts on hover (hover:-translate-y-1), so the image you
          click to open this panel sits inside a hovered, transformed card. Rendered inline,
          the dialog was trapped inside that card: clipped by its overflow-hidden and sized
          to the card instead of the viewport, which is exactly the broken download dialog
          reported on /history. Mounting it on <body>, which carries no transform, makes the
          panel viewport-sized and centred again. */}
      {isExpanded && canPreview
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size generation"
          onClick={requestClose}
          /* z-[60] clears the sticky header at z-50. The backdrop fades and the panel scales, on two
             different tokens: a dialog that arrives as one flat block reads as a screenshot dropped
             over the page. Same idiom as the gallery lightbox on the homepage. */
          className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm motion-reduce:animate-none ${
            isClosing ? 'animate-fade-out' : 'animate-fade-in'
          }`}
        >
          <div
            className={`max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-4 shadow-card motion-reduce:animate-none sm:p-5 ${
              isClosing ? 'animate-panel-out' : 'animate-panel-in' // 0.2s out, 0.26s in — leaving is quicker
            }`}
            // Stops a click on the panel from closing the overlay behind it.
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={generation.prompt || 'Generated Ghibli art'}
              className="mx-auto max-h-[70vh] w-full rounded-xl object-contain"
            />

            <p className="mt-4 text-base font-semibold text-slate-900">
              {generation.prompt || 'Untitled generation'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {[typeLabel(generation.type), style, createdAt, dimensions, sizeLabel]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle"
              >
                Download
              </button>
              <button
                type="button"
                onClick={requestClose} // Not `onCollapse`: the panel has to play `panel-out` first
                className="flex-1 rounded-xl border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-colors duration-200 hover:border-brand-500 hover:text-brand-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
          // The portal target: <body> owns this overlay now, not the card it was opened from.
          document.body,
        )
        : null}
    </article>
  );
}

export default GenerationCard;
