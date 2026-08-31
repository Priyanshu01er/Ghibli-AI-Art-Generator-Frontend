import { useCallback, useState } from 'react';
import useImageQueue from '../hooks/useImageQueue'; // The homepage's ordering fix, reused verbatim
import useRevealOnScroll, { revealDelay } from '../hooks/useRevealOnScroll';
import GenerationCard from './GenerationCard';

/**
 * A grid of saved generations, with the lightbox state and the image queue that belong to it.
 *
 * Extracted from the two places that had grown the same twenty lines: the history page's paginated grid
 * and the homepage's four-card recent strip. They differed only in their column classes, yet each kept a
 * private copy of `expandedId`, the delete-closes-the-lightbox rule, and the card prop list.
 *
 * The real reason it is one component now is the queue. Every card fetches its own bytes through an
 * authenticated endpoint (see `GenerationCard`'s docblock), so twelve cards used to open twelve parallel
 * requests and the grid assembled itself in *file-size* order — the exact bug `useImageQueue` was written
 * for on the homepage, reproduced here. The queue has to be owned one level above the card, which means
 * it has to be owned by whoever owns the map.
 *
 * It also gives the history page its per-page reset for free: `<GenerationGrid key={page}>` remounts on
 * pagination, so `settled` starts empty and the next page cascades like the first. `useImageQueue` needed
 * no new parameter for that, which is what keeps its six existing tests meaning exactly what they did.
 *
 * @param className The grid classes — column count and top margin stay with the caller.
 * @param generations The rows to render, in display order.
 * @param onDelete `remove(id)` from `useGenerationHistory`; the lightbox handling is done here.
 * @param deletingId The row currently being deleted, or null.
 */
function GenerationGrid({ className, generations, onDelete, deletingId }) {
  // One observer for the whole grid — the cards stagger off `revealDelay`, as every other group does.
  const [gridRef, isRevealed] = useRevealOnScroll();
  // Withholds each card's fetch until its turn, and its picture until every card ahead of it is showing.
  const queue = useImageQueue(generations.length, isRevealed);
  const [expandedId, setExpandedId] = useState(null);

  // `useCallback`, and not an inline arrow: the card runs its lightbox exit timer from an effect keyed on
  // this function, so a fresh identity every render would restart the timer and the panel would never
  // finish leaving.
  const collapse = useCallback(() => setExpandedId(null), []);

  /**
   * Deleting the row whose lightbox is open would leave a dialog over a picture that no longer exists,
   * so the panel closes first. This rule lived in `HistoryPage`; moving the grid had to bring it along.
   */
  const handleDelete = useCallback(
    async (id) => {
      setExpandedId((current) => (current === id ? null : current));
      await onDelete(id);
    },
    [onDelete],
  );

  return (
    <div ref={gridRef} className={className}>
      {generations.map((generation, index) => (
        <GenerationCard
          key={generation.id}
          generation={generation}
          // The card's own arrival: structure first, so the grid is never a blank region. The queue
          // below governs only the picture inside it.
          isRevealed={isRevealed}
          revealDelayClass={revealDelay(index)}
          queue={queue}
          queueIndex={index}
          isExpanded={expandedId === generation.id}
          onExpand={setExpandedId}
          onCollapse={collapse}
          onDelete={handleDelete}
          isDeleting={deletingId === generation.id}
        />
      ))}
    </div>
  );
}

export default GenerationGrid;
