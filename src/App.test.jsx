import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App, { resetScrollBehaviorForTopRoute } from './App';

beforeEach(() => {
  document.documentElement.style.scrollBehavior = '';
  document.body.style.scrollBehavior = '';
});

afterEach(() => {
  document.documentElement.style.scrollBehavior = '';
  document.body.style.scrollBehavior = '';
  vi.restoreAllMocks();
});

test('renders homepage hero heading', () => {
  render(<App />);
  // The headline types itself in one character per span, so no single element owns that run of
  // text any more. The accessible name is the stronger assertion anyway: it is what a screen
  // reader announces, and it covers both lines rather than the first one.
  const heading = screen.getByRole('heading', {
    level: 1,
    name: /Transform Your Photos into Ghibli Art with Ghibli AI/i,
  });
  expect(heading).toBeInTheDocument();
});

test('resetScrollBehaviorForTopRoute forces the scroll box to auto and restores it afterward', () => {
  document.documentElement.style.scrollBehavior = 'smooth';
  document.body.style.scrollBehavior = 'smooth';

  const restore = resetScrollBehaviorForTopRoute();

  expect(document.documentElement.style.scrollBehavior).toBe('auto');
  expect(document.body.style.scrollBehavior).toBe('auto');

  restore();

  expect(document.documentElement.style.scrollBehavior).toBe('smooth');
  expect(document.body.style.scrollBehavior).toBe('smooth');
});
