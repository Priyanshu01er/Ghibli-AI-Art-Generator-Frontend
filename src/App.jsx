import { useLayoutEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import CreatePage from './components/CreatePage';
import HistoryPage from './components/HistoryPage';
import HomePage from './components/HomePage';
import LegalPage from './components/LegalPage'; // Terms + Privacy, one page with two sections
import LoginPage from './components/LoginPage';
import NotFoundPage from './components/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import SignupPage from './components/SignupPage';

/**
 * Routes that render their own page from the top rather than scrolling to a section of
 * HomePage. HomePage owns its own scroll behaviour via the route→section map it shares
 * with Header and Footer, so those paths must not be forced to the top from here.
 */
// /legal is the top of the legal page; /terms and /privacy are the other two routes onto the
// same page and also open at the top now — jumping to a half is a same-page click only.
const SCROLL_TO_TOP_ROUTES = ['/create', '/login', '/signup', '/history', '/legal', '/terms', '/privacy'];

export function resetScrollBehaviorForTopRoute() {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  // Force the scrolling box and body to a literal instant scroll while the route settles;
  // otherwise smooth scroll on the root can still race the route change and trigger the
  // next section's observers before the legal page is ready to animate.
  root.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  return () => {
    root.style.scrollBehavior = previousRootBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  };
}

function ScrollToTop() {
  const { pathname } = useLocation();

  // useLayoutEffect rather than useEffect: a layout effect commits before the browser paints,
  // so the very first frame of the new route already shows its top. The effect version let one
  // frame of the new page paint at the old scroll offset (the /home footer) before jumping —
  // exactly the down-to-up sweep the first-click-after-render report described.
  useLayoutEffect(() => {
    const isScrollToTopRoute = SCROLL_TO_TOP_ROUTES.includes(pathname);

    // Take the scroll position away from the browser while we are on one of these routes: with
    // history.scrollRestoration left at its 'auto' default, the browser can move the viewport on
    // its own after a route change and race the jump below. Off these routes the default goes
    // back, so a Back press onto a section route still restores where the visitor was.
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = isScrollToTopRoute ? 'manual' : 'auto';
    if (!isScrollToTopRoute) {
      return;
    }

    const restore = resetScrollBehaviorForTopRoute();

    // Restore only after the browser has committed the instant jump; a single frame is too early
    // and would leak the auto scroll behavior into same-page section links that must stay smooth.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restore();
      });
    });

    // Give the browser its scroll-restoration mode back when we leave these routes.
    return () => {
      history.scrollRestoration = previousRestoration;
    };
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      {/* Inside the router on purpose: AuthProvider uses useNavigate so a 401 can bounce
          the user to /login through the router instead of reloading the document. */}
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/*
            These five all render HomePage, which scrolls to the matching section. They
            used to arrive here only via the catch-all — so they have to be listed
            explicitly now that `*` is a real 404, or the entire nav would 404.
          */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/features" element={<HomePage />} />
          <Route path="/gallery" element={<HomePage />} />
          <Route path="/faq" element={<HomePage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Three paths, one page: each opens at the top, and the hero pills / footer links
              scroll to the Terms or Privacy half only via their same-page click handlers. */}
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />

          {/* The generation endpoints require a token as of Phase 2, so an anonymous
              visitor here would only reach a form whose every submit 401s. */}
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreatePage />
              </ProtectedRoute>
            }
          />

          {/* Protected for a stronger reason than /create: every request this page makes is
              owner-scoped, so with no token there is nothing to show — only 401s. Listed
              explicitly rather than left to the catch-all, which PLAN.md 6.2 notes used to
              swallow /history silently. */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Was HomePage, which made every typo look like a successful navigation. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
