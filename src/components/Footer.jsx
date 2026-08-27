import { Link, useLocation } from 'react-router-dom';

function Footer() {
  const { pathname } = useLocation();

  const routeMap = {
    '/home': { sectionId: 'home', offset: 96 },
    '/features': { sectionId: 'features', offset: 16 },
    '/gallery': { sectionId: 'gallery', offset: 16 },
    '/faq': { sectionId: 'faq', offset: 72 },
    '/terms': { sectionId: 'terms', offset: 16 }, // Both halves of LegalPage live on one page…
    '/privacy': { sectionId: 'privacy', offset: 16 }, // …so clicking the current one scrolls
  };

  const handleFooterNavClick = (event, href) => {
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

  return (
    <footer className="border-t border-brand-100 bg-gradient-to-b from-white/90 to-brand-50/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link to="/home" onClick={(event) => handleFooterNavClick(event, '/home')} className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-stone-100">
              G
            </span>
            <span className="font-heading text-2xl font-bold">Ghibli AI</span>
          </Link>
          <p className="mt-3 bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-base font-semibold text-transparent drop-shadow-sm">
            Ignited by magic, crafted with cinematic artistry.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Links</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            <li><Link to="/home" onClick={(event) => handleFooterNavClick(event, '/home')} className="hover:text-brand-600">Home</Link></li>
            <li><Link to="/create" onClick={(event) => handleFooterNavClick(event, '/create')} className="hover:text-brand-600">Create</Link></li>
            <li><Link to="/features" onClick={(event) => handleFooterNavClick(event, '/features')} className="hover:text-brand-600">Features</Link></li>
            <li><Link to="/gallery" onClick={(event) => handleFooterNavClick(event, '/gallery')} className="hover:text-brand-600">Gallery</Link></li>
            <li><Link to="/faq" onClick={(event) => handleFooterNavClick(event, '/faq')} className="hover:text-brand-600">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Features</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* Were plain <li> text. The two generator links carry no onClick on purpose:
                handleFooterNavClick compares `pathname !== href` — which is always true for a
                `?tab=` link — and CreatePage reads the param itself, so the query must survive. */}
            <li><Link to="/create?tab=photo" className="hover:text-brand-600">Photo to Ghibli Art</Link></li>
            <li><Link to="/create?tab=text" className="hover:text-brand-600">Text to Ghibli Art</Link></li>
            {/* No character/background generator exists, so these point at the sections that
                describe what the app can actually do rather than at a form that cannot. */}
            <li><Link to="/features" onClick={(event) => handleFooterNavClick(event, '/features')} className="hover:text-brand-600">Character Generator</Link></li>
            <li><Link to="/gallery" onClick={(event) => handleFooterNavClick(event, '/gallery')} className="hover:text-brand-600">Background Generator</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Legal</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* Both pointed at /home before — there was no legal page at all. */}
            <li><Link to="/terms" onClick={(event) => handleFooterNavClick(event, '/terms')} className="hover:text-brand-600">Terms of Service</Link></li>
            <li><Link to="/privacy" onClick={(event) => handleFooterNavClick(event, '/privacy')} className="hover:text-brand-600">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-300 py-4 text-center text-sm text-slate-500">
        <p>2026 Ghibli AI. All rights reserved.</p>
        <p className="mt-1 text-xs text-slate-400">Created by Suhan Singh Rathore</p>
      </div>
    </footer>
  );
}

export default Footer;