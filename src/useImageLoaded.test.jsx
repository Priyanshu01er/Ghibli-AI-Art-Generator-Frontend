import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import useImageLoaded from './hooks/useImageLoaded';

/**
 * Three of the four cases here are the ones that leave a hole in the page if they are wrong: an
 * image that never fires `load` because it was already cached, an image that fails outright and must
 * still show its alt text, and the initial state that everything else depends on.
 */

/** A minimal host, in the shape the real callers use: the flag drives the *wrapper*, not the <img>. */
function Probe() {
  const [ref, isLoaded] = useImageLoaded();

  return (
    <div data-testid="wrapper" data-loaded={String(isLoaded)}>
      <img ref={ref} src="/sample.png" alt="" data-testid="image" />
    </div>
  );
}

const loadedFlag = (container) => container.querySelector('[data-testid="wrapper"]').dataset.loaded;

/**
 * The shape the create page has: the `<img>` does not exist until there is an artwork to put in it, and
 * a second generation replaces it with a different node.
 */
function LateProbe() {
  const [ref, isLoaded] = useImageLoaded();
  const [shown, setShown] = useState(0); // 0 = no image yet; the count also keys the node

  return (
    <div data-testid="wrapper" data-loaded={String(isLoaded)}>
      <button type="button" onClick={() => setShown((n) => n + 1)}>
        show
      </button>
      {shown > 0 ? (
        <img key={shown} ref={ref} src={`/sample-${shown}.png`} alt="" data-testid="image" />
      ) : null}
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks(); // The `complete`/`naturalWidth` getters are stubbed in the last test
});

test('an image that has not arrived yet reports false', () => {
  const { container } = render(<Probe />);

  expect(loadedFlag(container)).toBe('false'); // The wrapper is what stays transparent
});

test('a load event flips it to true', () => {
  const { container } = render(<Probe />);

  fireEvent.load(container.querySelector('[data-testid="image"]'));

  expect(loadedFlag(container)).toBe('true');
});

test('an error flips it to true as well, so the alt text is not left invisible', () => {
  const { container } = render(<Probe />);

  fireEvent.error(container.querySelector('[data-testid="image"]'));

  // A broken file must reveal its alt text. Waiting for a `load` that will never come would leave
  // an element faded to zero opacity with the alternative text inside it.
  expect(loadedFlag(container)).toBe('true');
});

test('an image that mounts later is still watched, and still fades in', () => {
  // The bug this pins was invisible in the worst way: the create page renders its result `<img>` only
  // once a generation lands, so with a `useRef` the hook's one effect run saw `null`, no listener was
  // ever attached, and the finished artwork stayed at `opacity-0` — a blank panel after a 30s wait.
  const { container } = render(<LateProbe />);

  expect(loadedFlag(container)).toBe('false'); // Nothing to watch yet

  fireEvent.click(screen.getByRole('button', { name: 'show' }));
  fireEvent.load(screen.getByTestId('image'));

  expect(loadedFlag(container)).toBe('true');
});

test('a second image starts hidden again, so it fades in rather than snapping on', () => {
  const { container } = render(<LateProbe />);

  fireEvent.click(screen.getByRole('button', { name: 'show' }));
  fireEvent.load(screen.getByTestId('image'));
  expect(loadedFlag(container)).toBe('true');

  // "Create Another", then generate again: a different node on the same hook. Without the reset it
  // would inherit the previous `true` and the second artwork would appear at full opacity.
  fireEvent.click(screen.getByRole('button', { name: 'show' }));

  expect(loadedFlag(container)).toBe('false');

  fireEvent.load(screen.getByTestId('image'));
  expect(loadedFlag(container)).toBe('true');
});

test('an already-cached image resolves on the first effect, with no event at all', () => {
  // A cached image is `complete` before React can attach anything, and its `load` event has already
  // fired — so if the hook only listened, that picture would stay invisible forever.
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1200);

  const { container } = render(<Probe />);

  // Nothing is fired here, and that is the whole assertion. Counting listeners would prove nothing:
  // React binds its own `load`/`error` pair directly to every <img> it renders.
  expect(loadedFlag(container)).toBe('true');
});
