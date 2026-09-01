import { useEffect, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference'; // Shared with useTypewriter

/**
 * Reveals a block of a page the first time it scrolls into view.
 *
 * One observer per *group* rather than per picture: the caller puts the ref on the container it
 * already has (a grid, a panel) and hands the stagger to its children as an `animation-delay`, so
 * eight gallery tiles cost one observer instead of eight.
 *
 * The legal page is the deliberate exception — each of its sixteen clauses owns an observer, with no
 * delay at all, because there the scroll *is* the cadence: an index-derived stagger would leave the
 * eighth point waiting out half a second while it sits alone on screen.
 *
 * It disconnects the moment it fires. A reveal that can play backwards on the way up the page reads
 * as a glitch rather than an entrance, and it would also re-run the stagger on every scroll.
 *
 * @returns `[ref, isRevealed]` — put the ref on the container, and switch its children between
 *   `opacity-0` and `animate-rise-in` (plus a `revealDelay()` entry) on `isRevealed`. The ref is a
 *   callback, not a `useRef` object: see the effect below for why that matters.
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
 *
 * Six entries rather than the original four: the legal hero stacks five items and each of its storage
 * columns lists five points. Every string must stay written out in full — Tailwind's JIT scans source
 * text, so `[animation-delay:${index * 80}ms]` produces a class that is never generated.
 */
export const REVEAL_DELAY = [
  '[animation-delay:0ms]',    // Quadratic ease-out: faster arrivals at the head,
  '[animation-delay:60ms]',   // so the first few tiles feel like a natural cluster
  '[animation-delay:130ms]',  // rather than a mechanically-spaced queue. The tail
  '[animation-delay:210ms]',  // spreads out just enough that the last item's arrival
  '[animation-delay:300ms]',  // still reads as its own event. 400ms cap kept.
  '[animation-delay:400ms]',
];

/**
 * `REVEAL_DELAY` by index, clamped to the last rung instead of running off the end. Reading the array
 * directly returns `undefined` past index 3, which stringifies into the class list as a silent no-op —
 * so a list longer than the ladder loses its stagger without anything looking broken.
 *
 * Clamping rather than growing the ladder forever is also a taste decision: past ~400ms a stagger stops
 * reading as a cascade and starts reading as a queue, so the tail of a long list arrives together.
 */
export function revealDelay(index) {
  return REVEAL_DELAY[Math.min(index, REVEAL_DELAY.length - 1)];
}

/** jsdom implements no IntersectionObserver, and setupTests.js adds no polyfill. */
/* Exported so `useImageQueue` fails open on exactly the same test, rather than keeping a second
   private copy of "can this environment do viewport-driven UI at all". */
export function canObserve() {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
}

export default function useRevealOnScroll() {
  /*
   * A *callback* ref held in state, not a `useRef` object, and the difference is a real bug rather than
   * a style: a block that mounts later than its component — the history page's empty state, which does
   * not exist until the fetch resolves — leaves `ref.current` null when the effect below first runs.
   * Nothing would ever re-run it, so the block would sit at `opacity-0` forever in every browser that
   * *has* an IntersectionObserver. A state setter re-renders when the node arrives, so the observer
   * follows the element instead of the mount. Stable identity, so `ref={setNode}` is not a new ref each
   * render, and React calls it with `null` on unmount, which clears the observer through the same path.
   */
  const [node, setNode] = useState(null);
  // Anything that cannot or should not animate starts already revealed, so the content is simply
  // there: reduced motion, the test environment, and any crawler that runs no observer.
  const [isRevealed, setIsRevealed] = useState(() => !canObserve() || prefersReducedMotion());

  useEffect(() => {
    if (isRevealed || !node) {
      return undefined; // Nothing left to wait for, or nothing to watch yet
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
    observer.observe(node);
    return () => observer.disconnect();
  }, [isRevealed, node]);

  return [setNode, isRevealed];
}
