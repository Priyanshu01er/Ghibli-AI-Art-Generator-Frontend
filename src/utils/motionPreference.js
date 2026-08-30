/**
 * Does this visitor want motion at all?
 *
 * Lifted out of `useTypewriter` once a second hook needed the same answer: the headline reveal and
 * the homepage's scroll reveals must both stand down for `prefers-reduced-motion: reduce`, and both
 * run in tests, where the media query does not exist.
 *
 * Guarded on both sides — `window` for safety, and `matchMedia` because jsdom does not implement it
 * and setupTests.js adds no polyfill, so an unguarded call would take App.test.jsx down with it.
 *
 * @returns true only when the OS-level setting is explicitly on; unknown means "motion is fine".
 */
export default function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
