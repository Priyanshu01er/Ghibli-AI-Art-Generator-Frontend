import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import useRevealOnScroll, {
  REVEAL_DELAY,
  REVEAL_ROOT_MARGIN,
  REVEAL_THRESHOLD,
  revealDelay,
} from './hooks/useRevealOnScroll';

/**
 * The hook has one job and two escape hatches, and it is the escape hatches that need protecting:
 * a visitor who asked for less motion, and any environment with no `IntersectionObserver` at all
 * (jsdom, and every crawler), must get the content already revealed rather than a page of
 * permanently invisible sections. That is also what keeps App.test.jsx green.
 */

/** A minimal host that puts the hook's state somewhere the test can read it. */
function Probe() {
  const [ref, isRevealed] = useRevealOnScroll();
  return <div ref={ref} data-testid="block" data-revealed={String(isRevealed)} />;
}

/**
 * The same probe, except the observed block does not exist on the first render — the shape the history
 * page's empty state has, since it is only rendered once its fetch has come back empty.
 */
function LateProbe() {
  const [ref, isRevealed] = useRevealOnScroll();
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        mount
      </button>
      {mounted ? <div ref={ref} data-testid="block" data-revealed={String(isRevealed)} /> : null}
    </>
  );
}

const isRevealed = (container) => container.querySelector('[data-testid="block"]').dataset.revealed;

afterEach(() => {
  vi.unstubAllGlobals(); // IntersectionObserver and matchMedia are both stubbed below
});

test('with no IntersectionObserver at all, the content is simply there', () => {
  // jsdom implements none, and neither does a crawler: the reveal must fail open, not closed.
  expect(window.IntersectionObserver).toBeUndefined();

  const { container } = render(<Probe />);

  expect(isRevealed(container)).toBe('true');
});

test('it hides the block, reveals it on first intersection, then stops watching', () => {
  let notify; // The callback the hook hands the observer
  const constructed = []; // The options each observer was built with
  const observe = vi.fn();
  const disconnect = vi.fn();

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback, options) {
        notify = callback;
        constructed.push(options);
      }

      observe = observe;

      disconnect = disconnect;
    },
  );

  const { container } = render(<Probe />);

  expect(isRevealed(container)).toBe('false'); // waiting off screen
  expect(observe).toHaveBeenCalledTimes(1);
  // The two numbers the reveal is tuned with, asserted so a change to them is deliberate.
  expect(constructed[0]).toEqual({ threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN });

  act(() => notify([{ isIntersecting: false }])); // scrolled near, but not far enough in
  expect(isRevealed(container)).toBe('false');

  act(() => notify([{ isIntersecting: true }]));
  expect(isRevealed(container)).toBe('true');
  // Disconnected the moment it fires: a reveal that could play backwards on the way up the page
  // would read as a glitch, and it would re-run the stagger on every scroll.
  expect(disconnect).toHaveBeenCalled();
});

test('a block that only mounts later is still observed, and still revealed', () => {
  // The bug this pins is silent and permanent: with a `useRef`, the effect ran once with `current`
  // still null, nothing re-ran it, and the block stayed at `opacity-0` for good in every browser that
  // *has* an observer. The history page's empty state is exactly this shape — it does not exist until
  // its fetch comes back empty — so a brand new account saw a page with nothing on it.
  let notify;
  const observe = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        notify = callback;
      }

      observe = observe;

      disconnect() {}
    },
  );

  const { container } = render(<LateProbe />);

  expect(observe).not.toHaveBeenCalled(); // Nothing to watch yet, and no observer wasted on it

  act(() => screen.getByRole('button', { name: 'mount' }).click());

  expect(observe).toHaveBeenCalledTimes(1); // The node arriving is what starts the watch
  expect(isRevealed(container)).toBe('false');

  act(() => notify([{ isIntersecting: true }]));
  expect(isRevealed(container)).toBe('true');
});

test('prefers-reduced-motion reveals immediately and never constructs an observer', () => {
  const construct = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor() {
        construct();
      }

      observe() {}

      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  const { container } = render(<Probe />);

  expect(isRevealed(container)).toBe('true');
  expect(construct).not.toHaveBeenCalled();
});

test('revealDelay clamps past the end of the ladder instead of returning undefined', () => {
  // The bug this exists to prevent is silent: `REVEAL_DELAY[6]` is `undefined`, which lands in a
  // template-literal class list as the string "undefined" — no delay, no error, no stagger. The
  // legal page's storage columns list five points and its hero stacks five items, so the ladder is
  // read right up to its last rung and a sixteen-clause page would have hit this first.
  expect(revealDelay(0)).toBe(REVEAL_DELAY[0]);
  expect(revealDelay(REVEAL_DELAY.length - 1)).toBe('[animation-delay:400ms]');
  // Past the end: the last rung, not `undefined`. Deliberately clamped rather than extended —
  // beyond ~400ms a stagger reads as a queue, so the tail of a long list arrives together.
  expect(revealDelay(REVEAL_DELAY.length)).toBe('[animation-delay:400ms]');
  expect(revealDelay(99)).toBe('[animation-delay:400ms]');
});
