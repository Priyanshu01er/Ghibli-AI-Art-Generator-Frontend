import { useEffect, useRef, useState } from 'react'; // For the menu's open state and outside-click target
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navItems } from '../data/homeData';
import logoMark from '../assets/logo-mark.png';

/**
 * The menu button's glyph: three dots, each with a short line beside it. One icon at every
 * breakpoint rather than a hamburger/kebab split by screen size, so the control means the
 * same thing on a phone as it does on a laptop.
 */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      {[6, 12, 18].map((y) => (
        <g key={y}>
          <circle cx="4.5" cy={y} r="1.7" className="fill-current" />
          <path d={`M9.5 ${y}h10`} className="stroke-current" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

/*
 * One shared row shape for the panel, split so the hover colour is chosen per row rather than
 * overridden: two `hover:bg-*` classes on one element resolve by Tailwind's output order, not
 * by the order they are written, so `Log out` gets its own string instead of appending to the
 * default one.
 */
const MENU_ROW = 'flex min-h-[44px] w-full items-center rounded-xl px-3 text-base font-medium transition-colors duration-200'; // 44px = smallest comfortable tap target; 200ms is the page's hover tempo
const MENU_ROW_DEFAULT = `${MENU_ROW} text-slate-700 hover:bg-brand-50 hover:text-brand-600`;
const MENU_ROW_DANGER = `${MENU_ROW} text-slate-700 hover:bg-red-50 hover:text-red-600`;

function Header() {
  const { pathname } = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // The one menu that replaced the auth cluster
  const [isScrolled, setIsScrolled] = useState(false); // Drives the bar's elevation shadow, below
  const [scrollProgress, setScrollProgress] = useState(0); // 0–1, drives the accent bar
  const menuRef = useRef(null); // Wraps button + panel, so an outside click can be told apart

  /**
   * A sticky bar that has started to overlap the page should look like it is above it. One boolean
   * past 8px is the whole feature — `{ passive: true }` so the listener can never delay a scroll,
   * and React bails out of the re-render whenever the value has not actually changed.
   */
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0);
    };

    onScroll(); // A reload halfway down the page must not start flat and then pop
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const routeMap = {
    '/home': { sectionId: 'home', offset: 96 },
    '/features': { sectionId: 'features', offset: 16 },
    '/gallery': { sectionId: 'gallery', offset: 16 },
    '/faq': { sectionId: 'faq', offset: 72 },
  };

  const handleNavClick = (event, href) => {
    if (pathname !== href) {
      return;
    }

    event.preventDefault();

    if (href === '/create') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    const routeConfig = routeMap[href];
    if (!routeConfig) {
      return;
    }

    const section = document.getElementById(routeConfig.sectionId);
    if (!section) {
      return;
    }

    const y = section.getBoundingClientRect().top + window.scrollY - routeConfig.offset;
    window.scrollTo({ top: Math.max(y, 0), left: 0, behavior: 'smooth' });
  };

  /**
   * A route change closes the panel. It is absolutely positioned inside a sticky header, so
   * without this it would hang over whichever page the click just opened.
   */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  /**
   * Escape and an outside click both dismiss it. Bound only while open — the same shape the
   * lightbox effect in `GallerySection` uses, so nothing document-level stays attached for a
   * menu that is closed.
   */
  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    // mousedown rather than click: a press that starts inside the panel and ends outside it is
    // a drag, not a dismissal.
    const onMouseDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [isMenuOpen]);

  /**
   * Leaves for a public page rather than staying put: most signed-in routes are behind
   * `ProtectedRoute`, so remaining would bounce the user to /login instead.
   */
  const handleLogout = () => {
    setIsMenuOpen(false); // The /home case below would not change `pathname`, so close it here
    logout();
    navigate('/home');
  };

  /**
   * Panel links close the menu as well as navigating. Required for the same-page case: clicking
   * `Gallery` while already on /gallery only scrolls, so `pathname` never changes and the effect
   * above never runs.
   */
  const handleMenuNavClick = (event, href) => {
    setIsMenuOpen(false);
    handleNavClick(event, href);
  };

  return (
    <header
      /* The shadow is the only thing that moves here: 300ms is slow enough that scrolling a few
         pixels does not flash it, fast enough that it feels attached to the gesture. */
      className={`glass-panel sticky top-0 z-50 border-b border-brand-100/80 transition-shadow duration-300 ${
        isScrolled ? 'shadow-card' : 'shadow-none'
      }`}
    >
      {/* Scroll progress bar: a thin accent line at the bottom of the header that fills as the visitor scrolls. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-brand-500 to-accent-500"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />
      {/* h-16 on a phone: 80px of a 667px-tall screen is a lot of chrome, and the bar now holds
          only two things there. gap-3 keeps the wordmark off the menu button at 360px. */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link to="/home" className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Task 1: circular logo cropped from src/assets/logo.png (cream bg removed). */}
          <img src={logoMark} alt="Ghibli AI logo" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          {/* text-xl below sm: at text-2xl the wordmark crowded the menu button on a 360px screen. */}
          <span className="truncate font-heading text-xl font-bold tracking-tight sm:text-2xl">
            Ghibli AI
          </span>
        </Link>

        {/* Was `md:flex gap-10 text-lg`, which needs ~740px for five links and so overflowed at
            768px. Now it appears at lg and only grows at xl; below lg these same links live in
            the menu panel, which is what a phone was missing entirely. */}
        <nav className="hidden items-center gap-6 text-base font-medium lg:flex xl:gap-10 xl:text-lg">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={(event) => handleNavClick(event, item.href)}
              className="transition-colors duration-200 hover:text-brand-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* An anonymous visitor keeps both auth actions in the bar from sm up — two items is
              not clutter, and it is the conversion path. Below sm they move into the panel. */}
          {!isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex sm:gap-3">
              <Link
                to="/login"
                /* `duration-200`, matching the nav links above: bare `transition-colors` runs at
                   Tailwind's default 150ms, so these two neighbours answered at different speeds. */
                className="rounded-xl px-3 py-2.5 text-base font-semibold text-slate-700 transition-colors duration-200 hover:text-brand-600"
              >
                Log in
              </Link>
              {/* Explicit padding/size overrides: `.btn-brand` is sized for page CTAs, which is
                  taller than a 64px header allows. */}
              <Link to="/signup" className="btn-brand px-4 py-2.5 text-base sm:px-5 sm:py-2.5 sm:text-base">
                Sign up
              </Link>
            </div>
          ) : null}

          {/* Task 1 in one element: this replaces the name span + History + Create + Log out that
              used to sit loose in the bar. Always present for a signed-in user (it is their
              account menu); for an anonymous one only below lg, where it is the only route to
              the site links. */}
          <div className={`relative ${isAuthenticated ? '' : 'lg:hidden'}`} ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              // A disclosure, not an ARIA `menu`: `role="menu"` would oblige arrow-key handling
              // that a four-item panel of plain links does not need.
              aria-expanded={isMenuOpen}
              aria-controls="header-menu"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-200 ${
                isMenuOpen
                  ? 'border-brand-500 bg-brand-50 text-brand-600'
                  : 'border-stone-300 bg-white/70 text-slate-700 hover:border-brand-500 hover:text-brand-600'
              }`}
            >
              <MenuIcon />
            </button>

            {/* Rendered always, opened with a transition instead of a mount. `visibility` is
                animatable and, per spec, stays `visible` for the whole transition when it is the
                *start* value — so the panel fades out and only then becomes hidden, which is also
                what takes its links out of the tab order and the accessibility tree while closed.
                No timers, no `inert`, nothing duplicated for a screen reader. */}
            <div
              id="header-menu"
              // Solid white, deliberately not the header's own `.glass-panel`: a 65%-opaque
              // dropdown sitting over the gallery images below is unreadable.
              /* One duration and one easing for both directions on purpose: a `duration-150` in the
                 closed branch would not win by being written later — Tailwind resolves competing
                 utilities by its own output order, not by the order in the class string. */
              className={`absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl bg-white p-2 shadow-card ring-1 ring-stone-200 transition-menu duration-200 ease-exit sm:w-64 ${
                isMenuOpen
                  ? 'visible translate-y-0 opacity-100'
                  : 'pointer-events-none invisible -translate-y-1 opacity-0'
              }`}
            >
              {isAuthenticated ? (
                // The name that used to sit loose in the bar, now with the email that was
                // previously only a `title` attribute. Both truncate — a long address should
                // widen nothing.
                <div className="border-b border-stone-200 px-3 pb-3 pt-1">
                  <p className="truncate text-base font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-sm text-slate-500">{user?.email}</p>
                </div>
              ) : null}

              {/* lg:hidden — from lg up these are already the visible row in the bar above.
                  For a signed-in user `/create` is dropped here because the account group below
                  always carries a `Create` row, and listing it twice in one 240px panel reads
                  as a bug; an anonymous visitor has no account group, so it stays. */}
              <nav className="lg:hidden">
                {navItems
                  .filter((item) => !isAuthenticated || item.href !== '/create')
                  .map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={(event) => handleMenuNavClick(event, item.href)}
                      className={MENU_ROW_DEFAULT}
                    >
                      {item.label}
                    </Link>
                  ))}
              </nav>

              {/* Divider above the account group, hidden at exactly the width where the group
                  below it has moved into the bar and there is nothing left to divide. */}
              <div
                className={`mx-3 my-1 border-t border-stone-200 ${isAuthenticated ? 'lg:hidden' : 'sm:hidden'}`}
              />

              {isAuthenticated ? (
                <>
                  {/* Explicit close on these two: navigating changes `pathname` and the effect
                      handles it, but clicking `History` while already on /history does not. */}
                  <Link to="/history" onClick={() => setIsMenuOpen(false)} className={MENU_ROW_DEFAULT}>
                    History
                  </Link>
                  <Link
                    to="/create"
                    onClick={(event) => handleMenuNavClick(event, '/create')}
                    className={MENU_ROW_DEFAULT}
                  >
                    Create
                  </Link>
                  <div className="mx-3 my-1 border-t border-stone-200" />
                  {/* Red tint marks it as the one destructive row, so it is not mistaken for
                      another navigation item. */}
                  <button type="button" onClick={handleLogout} className={MENU_ROW_DANGER}>
                    Log out
                  </button>
                </>
              ) : (
                // sm:hidden: from sm up these two are already buttons in the bar.
                <div className="sm:hidden">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className={MENU_ROW_DEFAULT}>
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className={`${MENU_ROW} text-brand-600 hover:bg-brand-50`}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
