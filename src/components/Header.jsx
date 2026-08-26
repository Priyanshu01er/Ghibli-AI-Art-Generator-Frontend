import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navItems } from '../data/homeData';

function Header() {
  const { pathname } = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

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
   * Leaves for a public page rather than staying put: /create is protected, so logging
   * out while on it would immediately bounce through ProtectedRoute to /login, which
   * reads as an error rather than as a deliberate sign-out.
   */
  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-brand-100/80">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/home" className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-glow">
            G
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight">Ghibli AI</span>
        </Link>

        <nav className="hidden items-center gap-10 text-lg font-medium md:flex">
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

        {/*
          Replaces the single Create button. Anonymous visitors get Log in / Sign up
          instead of Create, because /create is protected and would only bounce them to
          /login anyway — the nav above still links there for anyone who wants that route.
        */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-base font-semibold text-slate-700 lg:inline"
                title={user?.email}
              >
                {user?.name}
              </span>
              <Link
                to="/create"
                onClick={(event) => handleNavClick(event, '/create')}
                className="btn-brand px-5 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg"
              >
                Create
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2.5 text-base font-semibold text-slate-700 transition-colors hover:text-brand-600 sm:text-lg"
              >
                Log in
              </Link>
              <Link to="/signup" className="btn-brand px-5 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;