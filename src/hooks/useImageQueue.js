import { useCallback, useEffect, useRef, useState } from 'react';
import { canObserve } from './useRevealOnScroll'; // One shared answer to "can this environment animate at all"
import prefersReducedMotion from '../utils/motionPreference'; // Same fail-open rule as the reveal

/**
 * Makes a group of pictures arrive **in order**, one after another.
 *
 * The problem it solves is not a timing bug, it is a bandwidth one: a browser asks for every `<img>`
 * on screen at once, so they finish in *byte* order rather than in the order they are laid out. The
 * gallery's top row is 1.1MB, 4.3MB, 1.3MB and 2.2MB, so it used to assemble itself 1, 3, 4, 2 —
 * thirteen pictures popping in at random across the homepage.
 *
 * So the queue owns both halves of one decision: a slot's `src` is withheld until its turn, and a
 * slot's picture is only shown once every slot before it is already showing. Withholding the request
 * is what makes the first picture land ~4x sooner; holding the reveal is what makes the order a
 * guarantee rather than a hope.
 *
 * @param count Slots in this group.
 * @param isActive Usually the group's `useRevealOnScroll` flag — nothing is requested before then.
 * @returns `{ canLoad, isVisible, reportSettled }`, all three indexed by slot.
 */

/**
 * The minimum gap between two pictures appearing. Without it a warm cache settles all four in the
 * same tick and they would flash in together, which is the batch look this hook exists to remove.
 */
export const IMAGE_STEP_MS = 120;

/**
 * Requests allowed at once, taken in slot order. Two rather than one because a strictly serial
 * queue leaves the connection idle through every decode; two rather than eight because the point is
 * for the head of the queue to get half the bandwidth instead of an eighth of it.
 */
export const IMAGE_IN_FLIGHT = 2;

export default function useImageQueue(count, isActive) {
  // Decided once, on the first render, exactly as `useRevealOnScroll` decides `isRevealed`: anything
  // that cannot or should not animate gets every picture requested and shown immediately. That is
  // what keeps jsdom, crawlers and reduced-motion visitors looking at a whole page rather than at
  // the first two tiles of it.
  const [bypass] = useState(() => !canObserve() || prefersReducedMotion());
  const [settled, setSettled] = useState(() => new Set()); // Slots whose bytes have arrived (or failed)
  const [revealed, setRevealed] = useState(0); // How many slots are showing, counted from the head
  const lastRevealAt = useRef(0); // 0, so the very first arrival is not made to wait for a gap

  /**
   * Idempotent on purpose: a slot already in the set returns the *same* `Set` reference, so React
   * bails out of the re-render. That is what makes it safe for a tile to call this from an effect
   * whose dependencies change on every parent render.
   */
  const reportSettled = useCallback((index) => {
    setSettled((current) => {
      if (current.has(index)) {
        return current;
      }

      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  // Derived, never stored: every arrival — whichever slot it was — widens the window by one, so the
  // queue cannot wedge on a single slow file and there are always two requests in the air.
  const admitted = Math.min(count, settled.size + IMAGE_IN_FLIGHT);

  /**
   * Releases the head of the queue, and only the head. `settled.has(revealed)` is the whole ordering
   * guarantee: slot 3 finishing first advances nothing, it just widens the window above.
   */
  useEffect(() => {
    if (bypass || revealed >= count || !settled.has(revealed)) {
      return undefined; // Nothing to release, or the head has not arrived yet
    }

    // An absolute deadline rather than a fresh 120ms: re-running this effect (another slot settling)
    // recomputes the same remaining time instead of pushing the next picture further away.
    const wait = Math.max(0, IMAGE_STEP_MS - (Date.now() - lastRevealAt.current));

    const timer = setTimeout(() => {
      lastRevealAt.current = Date.now();
      setRevealed((shown) => shown + 1);
    }, wait);

    return () => clearTimeout(timer);
  }, [bypass, count, revealed, settled]);

  /** Whether slot `index` may be given its `src` yet. */
  const canLoad = useCallback(
    (index) => bypass || (isActive && index < admitted),
    [bypass, isActive, admitted],
  );

  /**
   * Whether slot `index` may be shown. Because `revealed` only ever steps past a slot that has
   * settled, this being true means the pixels are there — an empty box can never be released.
   */
  const isVisible = useCallback((index) => bypass || index < revealed, [bypass, revealed]);

  return { canLoad, isVisible, reportSettled };
}
