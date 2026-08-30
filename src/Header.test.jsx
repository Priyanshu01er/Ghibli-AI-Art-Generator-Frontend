import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';

/**
 * The dropdown stopped mounting and unmounting: it is always in the DOM and toggled with a
 * `visibility` transition, which is the only way it can fade *out* rather than vanish. That makes
 * two things worth pinning down — the panel must still be inert while closed (its links are now
 * rendered on every route), and nobody should quietly restore `{isMenuOpen ? … : null}`, which would
 * take the exit animation away again without breaking anything visible in a test.
 */

function renderHeader() {
  return render(
    // AuthProvider calls useNavigate, so it has to sit inside a router.
    <MemoryRouter initialEntries={['/home']}>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const panel = () => document.getElementById('header-menu');
const toggle = () => screen.getByRole('button', { name: /menu/i });

test('the panel is in the DOM while closed, and inert', () => {
  renderHeader();

  expect(panel()).not.toBeNull(); // Not a mount/unmount any more
  // `classList.contains`, not a substring check: 'invisible' contains 'visible'.
  expect(panel().classList.contains('invisible')).toBe(true);
  expect(panel().classList.contains('pointer-events-none')).toBe(true);
  expect(panel().classList.contains('opacity-0')).toBe(true);
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
});

test('opening reveals it, closing puts it back', () => {
  renderHeader();

  fireEvent.click(toggle());

  expect(panel().classList.contains('visible')).toBe(true);
  expect(panel().classList.contains('invisible')).toBe(false);
  expect(panel().classList.contains('opacity-100')).toBe(true);
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(toggle());

  // Back to hidden — and still present, which is what leaves the 200ms fade somewhere to happen.
  expect(panel().classList.contains('invisible')).toBe(true);
  expect(panel()).not.toBeNull();
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
});

test('the panel keeps its links while closed, and `visibility` is what hides them', () => {
  renderHeader();

  // Deliberate: these are rendered on every route now. In a browser `visibility: hidden` takes them
  // out of the tab order and the accessibility tree — jsdom applies no CSS, so the class contract
  // asserted above is the part a test can actually hold on to.
  const closed = within(panel());
  expect(closed.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  expect(closed.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
  expect(closed.getByRole('link', { name: 'Gallery' })).toBeInTheDocument();
});

test('the sticky bar carries no shadow until the page is scrolled', () => {
  renderHeader();

  const header = document.querySelector('header');

  expect(header.classList.contains('shadow-none')).toBe(true);

  // jsdom never scrolls on its own, and `scrollY` is an accessor there — so it is replaced rather
  // than assigned, then the listener is poked with the event it is actually bound to.
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 40 });
  fireEvent.scroll(window);

  expect(header.classList.contains('shadow-card')).toBe(true);
});
