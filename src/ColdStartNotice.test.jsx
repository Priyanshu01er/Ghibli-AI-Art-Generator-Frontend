import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import useBackendWakeUp, { COLD_START_NOTICE_DELAY_MS } from './hooks/useBackendWakeUp';
import ColdStartNotice from './components/ColdStartNotice';

/**
 * The behaviour under test is a timer, and the thing it guards against is a *silent* wait — so
 * "does the notice appear, and only after long enough" is the whole assertion. Doing this by
 * hand would mean waiting on a genuinely cold Render instance, which is neither repeatable nor
 * something you can arrange on demand.
 *
 * `warmUpBackend` is mocked because the hook fires it on mount: left real, every test here would
 * make a network call to a backend that is not running, and jsdom would log the rejection.
 */
vi.mock('./services/apiClient', () => ({
  warmUpBackend: vi.fn(() => Promise.resolve(true)),
}));

// Mirrors the two auth pages: the hook takes the existing submit flag, and the page renders the
// notice when it says to. Nothing else about either page matters here.
function Harness({ submitting }) {
  const isWaking = useBackendWakeUp(submitting);
  return isWaking ? <ColdStartNotice /> : null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const heading = () => screen.queryByText('Waking the server up');

/** The timer flips state, so advancing it has to be inside `act` like any other update. */
const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

test('a submit that has only just started shows nothing', () => {
  render(<Harness submitting />);

  // The point of the delay: a warm instance answers a login in well under a second, and a
  // "server is waking up" card flashing up on every successful sign-in would be noise.
  expect(heading()).not.toBeInTheDocument();
});

test('a submit still running after the delay explains itself', () => {
  render(<Harness submitting />);

  advance(COLD_START_NOTICE_DELAY_MS);

  expect(heading()).toBeInTheDocument();
  // role="status" and not "alert": this is progress, not a failure.
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('the notice goes away once the submit finishes', () => {
  const { rerender } = render(<Harness submitting />);
  advance(COLD_START_NOTICE_DELAY_MS);
  expect(heading()).toBeInTheDocument();

  rerender(<Harness submitting={false} />);

  // Reset rather than left on screen, so a failed attempt followed by a retry starts from
  // silence instead of showing a stale "waking up" card next to a real error message.
  expect(heading()).not.toBeInTheDocument();
});

test('a submit that finishes before the delay never shows the notice at all', () => {
  const { rerender } = render(<Harness submitting />);

  advance(COLD_START_NOTICE_DELAY_MS - 500);
  rerender(<Harness submitting={false} />);
  advance(5_000); // Well past the original deadline

  // The cleanup must clear the pending timer; without it this is where the notice would appear
  // after the form had already succeeded and navigated away.
  expect(heading()).not.toBeInTheDocument();
});

test('the wake ping fires once on mount, before any submit', async () => {
  const { warmUpBackend } = await import('./services/apiClient');
  warmUpBackend.mockClear();

  const { rerender } = render(<Harness submitting={false} />);
  rerender(<Harness submitting />);

  // Empty dep array: a re-render — including the one that starts a submit — must not re-ping.
  expect(warmUpBackend).toHaveBeenCalledTimes(1);
});

test('a page that never submits still fires the ping', async () => {
  const { warmUpBackend } = await import('./services/apiClient');
  warmUpBackend.mockClear();

  // How HomePage calls it: no argument at all, so the notice half is inert and only the wake runs.
  function HomeLike() {
    const isWaking = useBackendWakeUp();
    return <span>{String(isWaking)}</span>;
  }
  render(<HomeLike />);

  expect(warmUpBackend).toHaveBeenCalledTimes(1);
  expect(screen.getByText('false')).toBeInTheDocument();
});

// Guards the reason the hook deliberately never calls setState on the ping's completion: a state
// write from an unawaited promise is what produces `act()` warnings in App.test.jsx.
test('a resolved ping does not re-render the caller', async () => {
  const renders = vi.fn();

  function Counting() {
    const [, setTick] = useState(0);
    renders();
    useBackendWakeUp();
    // Present only so a stray setState from the hook would be visible as an extra render.
    void setTick;
    return null;
  }

  render(<Counting />);
  const before = renders.mock.calls.length;

  await act(async () => {
    await vi.runAllTimersAsync(); // Lets the mocked promise settle
  });

  expect(renders.mock.calls.length).toBe(before);
});
