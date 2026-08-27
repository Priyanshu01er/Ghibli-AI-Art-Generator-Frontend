import { useEffect } from 'react';
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
// /legal is the top of the legal page; /terms and /privacy are sections of it and scroll
// themselves, which is why only the first is listed — the same rule as /features and /gallery.
const SCROLL_TO_TOP_ROUTES = ['/create', '/login', '/signup', '/history', '/legal'];

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (SCROLL_TO_TOP_ROUTES.includes(pathname)) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
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

          {/* Three paths, one page: /legal opens at the top, /terms and /privacy scroll to
              their half — the same shape as /features|/gallery|/faq → HomePage. Public on
              purpose: policies have to be readable before signing up. */}
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
