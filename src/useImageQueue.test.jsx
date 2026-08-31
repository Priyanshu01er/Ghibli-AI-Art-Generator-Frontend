import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import useImageQueue, { IMAGE_IN_FLIGHT, IMAGE_STEP_MS } from './hooks/useImageQueue';

/**
 * The bug this hook exists to fix was invisible to every other suite: thirteen homepage pictures were
 * requested at once and so appeared in file-size order, 1, 3, 4, 2 across the gallery's top row. The
 * centrepiece here is therefore the *out-of-turn* case — a slot that finishes early must not be shown
 * early — plus the two escape hatches, which matter just as much: an environment that cannot animate
 * has to get every picture at once rather than a page stuck on its first two tiles.
 */

/**
 * A minimal host in the shape the real callers use: one row per slot, carrying the hook's two answers
 * as data attributes, and a button that plays the part of the `load` event.
 */
function Probe({ count = 4, isActive = true }) {
  const { canLoad, isVisible, reportSettled } = useImageQueue(count, isActive);

  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          data-testid={`slot-${index}`}
          data-can-load={String(canLoad(index))}
          data-visible={String(isVisible(index))}
          onClick={() => reportSettled(index)} // Stands in for the <img>'s load event
        />
      ))}
    </div>
  );
}

const slot = (container, index) => container.querySelector(`[data-testid="slot-${index}"]`);
const canLoad = (container, index) => slot(container, index).dataset.canLoad;
const isVisible = (container, index) => slot(container, index).dataset.visible;
/** The queue reads its bytes-have-arrived signal from `useImageLoaded`; a click is that signal. */
const settle = (container, index) => fireEvent.click(slot(container, index));

/** Present in the browser, absent in jsdom — and the hook fails open without it, so it must be here. */
function stubObserver() {
  vi.stubGlobal('IntersectionObserver', class {});
}

afterEach(() => {
  vi.unstubAllGlobals(); // IntersectionObserver, and matchMedia in the reduced-motion test
  vi.useRealTimers();
});

test('at rest only the first few slots may load, and none of them is showing', () => {
  stubObserver();

  const { container } = render(<Probe />);

  // Two requests in the air, taken from the head of the queue: this is the half of the fix that
  // makes the first picture land sooner instead of sharing the pipe with three others.
  expect(canLoad(container, 0)).toBe('true');
  expect(canLoad(container, IMAGE_IN_FLIGHT - 1)).toBe('true');
  expect(canLoad(container, IMAGE_IN_FLIGHT)).toBe('false');
  expect(isVisible(container, 0)).toBe('false'); // Nothing has arrived yet
});

test('nothing loads at all before the group is active', () => {
  stubObserver();

  const { container } = render(<Probe isActive={false} />);

  // The reveal has not fired, so the section is still off screen. Requesting now would spend the
  // bandwidth the visible part of the page needs.
  expect(canLoad(container, 0)).toBe('false');
});

test('a slot that finishes out of turn is still not shown', () => {
  stubObserver();

  const { container } = render(<Probe />);

  settle(container, 1); // The smaller file wins the race, exactly as O3.jpg used to beat O2.png

  // The whole point of the hook: slot 1 waits for slot 0 rather than appearing on its own.
  expect(isVisible(container, 1)).toBe('false');
  expect(isVisible(container, 0)).toBe('false');
  // It does widen the window, though — the queue advances on *any* arrival, so one slow file can
  // never leave the connection idle.
  expect(canLoad(container, IMAGE_IN_FLIGHT)).toBe('true');
});

test('the head appears immediately, and the next one a step behind it', () => {
  vi.useFakeTimers();
  stubObserver();

  const { container } = render(<Probe />);

  settle(container, 0);
  settle(container, 1); // Both files land in the same tick, as they do on a warm cache

  act(() => vi.advanceTimersByTime(1)); // The first arrival is not made to wait for a gap
  expect(isVisible(container, 0)).toBe('true');
  // Without the minimum gap a warm cache would flash all four in together — the batch look this
  // hook exists to remove.
  expect(isVisible(container, 1)).toBe('false');

  act(() => vi.advanceTimersByTime(IMAGE_STEP_MS - 2));
  expect(isVisible(container, 1)).toBe('false');

  act(() => vi.advanceTimersByTime(2));
  expect(isVisible(container, 1)).toBe('true');
});

test('with no IntersectionObserver at all, every picture is requested and shown at once', () => {
  // jsdom implements none, and neither does a crawler. Failing open here is what keeps the other
  // suites green and what stops a page from ever being served two tiles and three empty boxes.
  expect(window.IntersectionObserver).toBeUndefined();

  const { container } = render(<Probe isActive={false} />);

  expect(canLoad(container, 3)).toBe('true'); // Even the last slot, and even while inactive
  expect(isVisible(container, 3)).toBe('true');
});

test('prefers-reduced-motion skips the queue entirely', () => {
  stubObserver();
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  const { container } = render(<Probe />);

  // A cascade is motion. Someone who asked for less of it gets the content, not the choreography.
  expect(canLoad(container, 3)).toBe('true');
  expect(isVisible(container, 3)).toBe('true');
});
