import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import LegalPage from './components/LegalPage';
import { AuthProvider } from './context/AuthContext';
import { privacyClauses, privacyNeverStored, privacyStored, termsClauses } from './data/legalData';

/**
 * This page just learned to animate, and it is the one page on the site where a reveal that failed
 * *closed* would be a real failure rather than a cosmetic one: sixteen clauses of terms and privacy
 * text, each now gated on its own `IntersectionObserver`, would be sixteen invisible paragraphs in any
 * browser without one. A policy nobody can read is not a policy.
 *
 * jsdom implements no `IntersectionObserver`, so this suite is exactly that browser — which makes the
 * fail-open path the default here rather than something the test has to arrange.
 */

function renderLegalPage(route = '/terms') {
  return render(
    // LegalPage renders Header, which calls useAuth; AuthProvider calls useNavigate. Same harness
    // as Header.test.jsx — a router outside the provider, the provider outside the page.
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <LegalPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Both halves are on one page, so a heading match can legitimately return more than one node. */
const headingsNamed = (title) => screen.getAllByRole('heading', { level: 3, name: title });

test('the reveal fails open: no IntersectionObserver, and the content is simply there', () => {
  expect(window.IntersectionObserver).toBeUndefined(); // The premise of this whole file

  renderLegalPage();

  // The hero, both intro rows and the closing card each own an observer too, and all four have to
  // fail open the same way — checked through one line of copy from the hero and one from the end.
  expect(screen.getByRole('heading', { level: 1, name: 'The short, honest version' })).toBeVisible();
  expect(screen.getByRole('heading', { level: 2, name: 'That is all of it' })).toBeVisible();
});

test('all sixteen clauses are present, and not one is left hidden', () => {
  renderLegalPage();

  const allClauses = [...termsClauses, ...privacyClauses];
  expect(allClauses).toHaveLength(16); // Guards the count itself: a dropped clause must fail here

  allClauses.forEach((clause) => {
    // 'Changes, and how to reach us' closes both halves, so the title is not unique on the page.
    const matches = headingsNamed(clause.title);
    expect(matches.length).toBeGreaterThan(0);

    matches.forEach((heading) => {
      const card = heading.closest('li');
      expect(card).not.toBeNull();
      // The actual contract: `opacity-0` is what the observer would leave behind if it never fired,
      // and `classList.contains` rather than a substring check because 'opacity-0' is a prefix of
      // 'opacity-05' and friends.
      expect(card.classList.contains('opacity-0')).toBe(false);
      expect(card.classList.contains('animate-rise-in')).toBe(true);
    });
  });
});

test('the numbers still number, and each badge is revealed with its clause', () => {
  renderLegalPage();

  // Both `<ol>`s restart at 1, which is why `index + 1` is per-list rather than page-wide.
  const badges = screen.getAllByText('8', { selector: 'span' });
  expect(badges).toHaveLength(2); // The eighth clause of each half

  badges.forEach((badge) => {
    expect(badge.classList.contains('opacity-0')).toBe(false);
    // 140ms behind its card, so the number lands into a clause that has already arrived. Asserted
    // because the delay is a static string — a template literal here would emit no class at all.
    expect(badge.classList.contains('animate-pop-in')).toBe(true);
    expect(badge.classList.contains('[animation-delay:140ms]')).toBe(true);
  });
});

test('both storage columns list all five of their points, revealed', () => {
  renderLegalPage('/privacy');

  [...privacyStored, ...privacyNeverStored].forEach((item) => {
    const point = screen.getByText(item).closest('li');
    expect(point.classList.contains('opacity-0')).toBe(false);
    // The fifth point sits on `revealDelay(4)`, which is the rung that did not exist before this
    // page: reading `REVEAL_DELAY[4]` used to yield `undefined` and silently drop the stagger.
    expect(point.classList.contains('animate-rise-in')).toBe(true);
  });

  const lastKept = screen.getByText(privacyStored[4]).closest('li');
  expect(lastKept.classList.contains('[animation-delay:320ms]')).toBe(true);
});
