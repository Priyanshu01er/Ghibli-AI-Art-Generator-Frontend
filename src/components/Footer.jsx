import { Link, useLocation } from 'react-router-dom';
import logoMark from '../assets/logo-mark.png';

function Footer() {
  const { pathname } = useLocation();

  const routeMap = {
    '/home': { sectionId: 'home', offset: 96 },
    '/features': { sectionId: 'features', offset: 16 },
    '/faq': { sectionId: 'faq', offset: 72 },
    '/terms': { sectionId: 'terms', offset: 16 }, // Both halves of LegalPage live on one page…
    '/privacy': { sectionId: 'privacy', offset: 16 }, // …so clicking the current one scrolls
    // '/gallery' removed: its only consumer was the deleted Links column in this footer.
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
      {/* Brand block anchors the left, Features + Legal form a middle-right cluster.
          Was `[1.4fr_auto_auto]`: an `fr` column next to two `auto`s absorbs *all* the slack, so
          the link columns were pinned to the right edge with ~350px of dead space after the
          tagline. Three proportional columns instead — the links start just past the tagline,
          keeping a clear gap without hugging the edge, and gap-x-16 replaces the wide gap-x-24. */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[2fr_1fr_1fr] lg:gap-x-16 lg:px-8">
        <div>
          <Link to="/home" onClick={(event) => handleFooterNavClick(event, '/home')} className="flex items-center gap-3">
            {/* Task 1: reuse the same circular brand mark as the header. */}
            <img src={logoMark} alt="Ghibli AI logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-heading text-2xl font-bold">Ghibli AI</span>
          </Link>
          {/* max-w-sm so the tagline wraps on its own terms instead of running toward the links. */}
          <p className="mt-3 max-w-sm bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-base font-semibold text-transparent drop-shadow-sm">
            Ignited by magic, crafted with cinematic artistry.
          </p>
        </div>

        {/* The old "Links" column (Home/Create/Features/Gallery/FAQ) was removed — the header
            already covers those routes, and this footer is now three tidy columns instead of
            two overlapping lists. */}

        <div>
          <h3 className="text-xl font-semibold">Features</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* Were plain <li> text. The two generator links carry no onClick on purpose:
                handleFooterNavClick compares `pathname !== href` — which is always true for a
                `?tab=` link — and CreatePage reads the param itself, so the query must survive. */}
            <li><Link to="/create?tab=photo" className="hover:text-brand-600">Photo to Ghibli Art</Link></li>
            <li><Link to="/create?tab=text" className="hover:text-brand-600">Text to Ghibli Art</Link></li>
            {/* Moved here from the deleted "Links" column: an overview link alongside the two
                specific generators it describes. */}
            <li><Link to="/features" onClick={(event) => handleFooterNavClick(event, '/features')} className="hover:text-brand-600">Features</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Legal</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* The two legal links pointed at /home before — there was no legal page at all. */}
            <li><Link to="/terms" onClick={(event) => handleFooterNavClick(event, '/terms')} className="hover:text-brand-600">Terms of Service</Link></li>
            <li><Link to="/privacy" onClick={(event) => handleFooterNavClick(event, '/privacy')} className="hover:text-brand-600">Privacy Policy</Link></li>
            {/* Moved here from the deleted "Links" column: FAQs are mostly policy answers, so
                they read naturally next to Terms and Privacy. */}
            <li><Link to="/faq" onClick={(event) => handleFooterNavClick(event, '/faq')} className="hover:text-brand-600">FAQ</Link></li>
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