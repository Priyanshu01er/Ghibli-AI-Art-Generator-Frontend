import { useEffect, useRef, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference'; // Shared with useTypewriter

/**
 * Reveals a block of the homepage the first time it scrolls into view.
 *
 * One observer per *group* rather than per picture: the caller puts the ref on the container it
 * already has (a grid, a panel) and hands the stagger to its children as an `animation-delay`, so
 * eight gallery tiles cost one observer instead of eight.
 *
 * It disconnects the moment it fires. A reveal that can play backwards on the way up the page reads
 * as a glitch rather than an entrance, and it would also re-run the stagger on every scroll.
 *
 * @returns `[ref, isRevealed]` — put the ref on the container, and switch its children between
 *   `opacity-0` and `animate-rise-in` (plus a `REVEAL_DELAY` entry) on `isRevealed`.
 */

/** Enough of the block in view to be worth animating, minus the last 8% of the viewport so it does
 *  not start in the corner of the visitor's eye. */
export const REVEAL_THRESHOLD = 0.15;
export const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';

/**
 * The stagger, shared by every group on the page so the rhythm is one decision rather than three
 * private copies of it. `animation-delay`, not `transition-delay`, and that is the whole point: a
 * `delay-*` class delays the element's *transitions* too, so a tile staggered by 300ms took 300ms to
 * begin releasing its hover glow. An animation delay cannot touch a transition.
 *
 * 80ms rather than 100ms: four tiles land 240ms apart, which reads as a beat rather than a queue.
 */
export const REVEAL_DELAY = [
  '[animation-delay:0ms]',
  '[animation-delay:80ms]',
  '[animation-delay:160ms]',
  '[animation-delay:240ms]',
];


/** jsdom implements no IntersectionObserver, and setupTests.js adds no polyfill. */
function canObserve() {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
}

export default function useRevealOnScroll() {
  const ref = useRef(null);
  // Anything that cannot or should not animate starts already revealed, so the content is simply
  // there: reduced motion, the test environment, and any crawler that runs no observer.
  const [isRevealed, setIsRevealed] = useState(() => !canObserve() || prefersReducedMotion());

  useEffect(() => {
    if (isRevealed || !ref.current) {
      return undefined; // Nothing left to wait for
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsRevealed(true);
          observer.disconnect(); // Once revealed, revealed for good
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN },
    );

    // Fires immediately for a block that is already on screen, so nothing above the fold waits.
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isRevealed]);

  return [ref, isRevealed];
}
