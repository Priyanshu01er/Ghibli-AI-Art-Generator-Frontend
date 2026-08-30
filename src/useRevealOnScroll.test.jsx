import { act, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import useRevealOnScroll, { REVEAL_ROOT_MARGIN, REVEAL_THRESHOLD } from './hooks/useRevealOnScroll';

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
