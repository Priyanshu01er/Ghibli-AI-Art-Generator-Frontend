import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import HeroHeadline, { HEADLINE_TEXT } from './components/HeroHeadline';
import { CARET_BLINK_MS, TYPE_START_DELAY_MS, caretAlpha } from './hooks/useTypewriter';

/**
 * What is worth testing here is not "does it look nice" but the things the design is built to
 * protect, all of which are invisible in a screenshot:
 *
 *  1. Every character is in the DOM from the first render, so the block below the headline cannot
 *     be pushed down as the text arrives, and no letter ever moves through the gradient it is
 *     painted from.
 *  2. The heading still reads as one whole sentence to assistive tech and to `getByRole`, even
 *     while it is 3 characters into 51.
 *  3. **No frame ever draws two characters.** That quantisation — not the jitter — is what made the
 *     first version read as a machine gun, so the invariant is asserted rather than eyeballed.
 *  4. The sentence takes a human amount of time, so nobody can quietly make it superhuman again.
 *
 * The clock is a hand-rolled `requestAnimationFrame` rather than `vi.useFakeTimers`: the hook reads
 * the timestamp its own callback is handed and uses no other clock, so stubbing rAF is both the
 * whole surface and exact — this file knows precisely what time the hook thinks it is.
 */

/** 60Hz, the rate the interval floor in useTypewriter is chosen against. */
const FRAME_MS = 1000 / 60;

let pendingFrames; // id → callback, exactly like the real queue
let frameTime; // The timestamp the next frame will be handed

beforeEach(() => {
  pendingFrames = new Map();
  frameTime = 0;
  let nextId = 1;

  vi.stubGlobal('requestAnimationFrame', (callback) => {
    const id = nextId;
    nextId += 1;
    pendingFrames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id) => pendingFrames.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals(); // rAF, plus the matchMedia the reduced-motion test replaces
});

/**
 * Run `count` frames, one at a time, each inside its own `act` so the DOM can be inspected between
 * them. The hook takes its `start` from the first frame it is handed, so after `frames(n)` the
 * animation believes `(n - 1) × 16.67ms` have elapsed.
 */
const frames = (count = 1) => {
  for (let i = 0; i < count; i += 1) {
    frameTime += FRAME_MS;
    // Snapshot first: a callback that re-requests must run on the *next* frame, not this one.
    const due = [...pendingFrames.values()];
    pendingFrames.clear();
    act(() => due.forEach((callback) => callback(frameTime)));
  }
};

/** Frames needed for the hook to believe `ms` have elapsed (frame 1 is elapsed 0). */
const framesFor = (ms) => Math.ceil(ms / FRAME_MS) + 1;

const heading = () => screen.getByRole('heading', { level: 1 });

/** The character spans: the only elements in the h1 that hold text directly. */
const letters = () =>
  [...heading().querySelectorAll('span')].filter(
    (span) => span.firstChild && span.firstChild.nodeType === Node.TEXT_NODE,
  );

const visibleLetters = () => letters().filter((span) => !span.classList.contains('invisible'));

/** The caret is the h1's only absolutely positioned element. */
const carets = () => [...heading().querySelectorAll('.absolute')];

/**
 * Every `--caret-alpha` the loop has written so far, newest last. Read through a spy rather than off
 * `style` because the value is a CSS custom property, which jsdom's style object need not support.
 */
const alphaWrites = (spy) =>
  spy.mock.calls.filter(([property]) => property === '--caret-alpha').map(([, value]) => Number(value));

const spyOnAlpha = () => vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty');

test('the heading is the whole sentence before a single character is showing', () => {
  render(<HeroHeadline />);

  // getByRole resolves the name from aria-label, so this passes on the very first render — a
  // crawler and a screen reader both get the finished headline, not a fragment of it.
  expect(screen.getByRole('heading', { level: 1, name: HEADLINE_TEXT })).toBeInTheDocument();
  expect(visibleLetters()).toHaveLength(0);
});

test('every character holds its final position from the first render', () => {
  render(<HeroHeadline />);

  // One span per character, and the '\n' that paces the line break is not one of them — hence the
  // -1 against the space-joined sentence. This count not changing during the animation is what
  // keeps the paragraph, the CTA and the pills below from moving.
  expect(letters()).toHaveLength(HEADLINE_TEXT.length - 1);
  // Same characters as the sentence, ignoring whitespace: the space in HEADLINE_TEXT stands in for
  // the line break, which is paced like a keystroke but never drawn.
  expect(letters().map((span) => span.textContent).join('').replace(/\s/g, '')).toBe(
    HEADLINE_TEXT.replace(/\s/g, ''),
  );
  letters().forEach((span) => expect(span).toHaveClass('invisible')); // reserved, not yet drawn
});

test('the first character lands on the frame after the opening beat, and lands alone', () => {
  render(<HeroHeadline />);

  frames(framesFor(TYPE_START_DELAY_MS) - 1); // elapsed 283ms: the caret is still just waiting
  expect(visibleLetters()).toHaveLength(0);

  frames(); // elapsed 300ms
  expect(visibleLetters().map((span) => span.textContent).join('')).toBe('T');

  // Still only 'T' a frame later: the second key cannot be due before 326ms (TYPE_MIN_MS above one
  // frame is exactly what buys this), so no frame can ever have to draw two characters at once.
  frames();
  expect(visibleLetters()).toHaveLength(1);
});

test('no single frame ever draws more than one character', () => {
  render(<HeroHeadline />);

  let previous = 0;
  let framesRun = 0;

  // Frame by frame to the end of the sentence, checking the step every time. This is the smoothness
  // invariant stated as a test: monotonic, and never +2.
  while (previous < letters().length && framesRun < 600) {
    frames();
    framesRun += 1;
    const now = visibleLetters().length;

    expect(now).toBeGreaterThanOrEqual(previous);
    expect(now - previous).toBeLessThanOrEqual(1);
    previous = now;
  }

  expect(previous).toBe(letters().length); // and it did finish, rather than running out of frames
});

test('the sentence takes a human amount of time', () => {
  render(<HeroHeadline />);

  let framesRun = 0;
  while (visibleLetters().length < letters().length && framesRun < 600) {
    frames();
    framesRun += 1;
  }

  // The pace was chosen with the user: ≈3.5s to the last character. The window is wide enough for
  // every way the jitter and the ~3 hesitations can fall, and narrow enough that the 1.4s machine
  // gun this replaced — or a future "let's speed it up" — fails here.
  const elapsed = (framesRun - 1) * FRAME_MS;
  expect(elapsed).toBeGreaterThan(2_500);
  expect(elapsed).toBeLessThan(5_000);
});

test('the caret waits, rides the last character typed, then leaves for good', () => {
  render(<HeroHeadline />);

  // Parked on character 0 before anything is typed: the cursor is visibly waiting to start.
  expect(carets()).toHaveLength(1);
  expect(carets()[0].parentElement).toBe(letters()[0]);

  frames(framesFor(TYPE_START_DELAY_MS + 600)); // mid-sentence
  const shown = visibleLetters();
  expect(shown.length).toBeGreaterThan(1);
  expect(carets()[0].parentElement).toBe(shown[shown.length - 1]);

  frames(400); // ≈6.6s: past the last character and past the caret's linger, whichever way it fell
  // Nothing left over: the resting frame is the headline exactly as it was before this animation
  // existed, with no extra element in it.
  expect(carets()).toHaveLength(0);
});

test('the caret is solid while keys are landing, and fades once they stop', () => {
  const setProperty = spyOnAlpha();
  render(<HeroHeadline />);

  // A real text cursor does not blink while it is moving, so every frame of the sentence writes 1.
  frames(framesFor(TYPE_START_DELAY_MS + 900));
  expect(alphaWrites(setProperty).length).toBeGreaterThan(10); // the loop really is writing every frame
  expect(alphaWrites(setProperty).every((alpha) => alpha === 1)).toBe(true);

  // Then it goes idle, and inside one blink period it has faded off and come back.
  frames(400);
  const settled = alphaWrites(setProperty);
  expect(Math.min(...settled)).toBe(0); // fully off at the bottom of the wave
  expect(settled.some((alpha) => alpha > 0 && alpha < 1)).toBe(true); // and ramped, not flicked

  setProperty.mockRestore();
});

test('the caret blink is a square wave with ramps, not a flick', () => {
  // The shape, as a unit: two flat stretches and two ~106ms ramps per period. Held here rather than
  // inferred from the DOM so a change to the curve is a deliberate edit to a number, not a surprise.
  expect(caretAlpha(0)).toBe(1);
  expect(caretAlpha(CARET_BLINK_MS * 0.2)).toBe(1);
  expect(caretAlpha(CARET_BLINK_MS * 0.45)).toBeCloseTo(0.5, 5); // mid fade-out
  expect(caretAlpha(CARET_BLINK_MS * 0.7)).toBe(0);
  expect(caretAlpha(CARET_BLINK_MS * 0.95)).toBeCloseTo(0.5, 5); // mid fade-in
  expect(caretAlpha(CARET_BLINK_MS * 2)).toBe(1); // and it repeats
});

test('prefers-reduced-motion gets the finished headline and no animation at all', () => {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  render(<HeroHeadline />);

  expect(visibleLetters()).toHaveLength(letters().length); // whole sentence on the first render
  expect(carets()).toHaveLength(0);
  expect(pendingFrames.size).toBe(0); // not one frame was ever asked for

  frames(400);
  // Still nothing: no loop was ever started, so there is no delayed surprise either.
  expect(visibleLetters()).toHaveLength(letters().length);
  expect(carets()).toHaveLength(0);
});
