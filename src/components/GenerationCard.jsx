import { useEffect, useState } from 'react';
import { fetchGenerationImage } from '../services/apiClient';
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
 */
function GenerationCard({
  generation,
  isExpanded = false,
  onExpand,
  onCollapse,
  onDelete,
  isDeleting = false,
}) {
  const { id } = generation;
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
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
  }, [id]);

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
        onCollapse?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isExpanded, onCollapse]);

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

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200">
      <div className="relative aspect-square bg-stone-50/80">
        {canPreview ? (
          <button
            type="button"
            onClick={() => onExpand?.(id)}
            className="group block h-full w-full cursor-zoom-in"
            title="View full size"
          >
            <img
              src={imageUrl}
              alt={generation.prompt || 'Generated Ghibli art'}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            {imageError ? (
              <p className="text-sm font-medium text-red-600">{imageError}</p>
            ) : (
              <div className="h-full w-full animate-pulse rounded-none bg-stone-200/70" />
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
            className={`rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform ${
              canPreview ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-60'
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
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
              isConfirmingDelete
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-stone-300 bg-white text-slate-500 hover:border-red-400 hover:text-red-600'
            } ${isDeleting ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {/* Two-step rather than window.confirm: a native dialog blocks the whole tab
                and cannot be styled, and this is a reversible-by-regenerating action, not
                a destructive one worth a modal. */}
            {isDeleting ? '…' : isConfirmingDelete ? 'Sure?' : 'Delete'}
          </button>
        </div>
      </div>

      {isExpanded && canPreview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size generation"
          onClick={onCollapse}
          // z-[60] clears the sticky header at z-50.
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
        >
          <div
            className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-4 shadow-card sm:p-5"
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
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Download
              </button>
              <button
                type="button"
                onClick={onCollapse}
                className="flex-1 rounded-xl border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default GenerationCard;
