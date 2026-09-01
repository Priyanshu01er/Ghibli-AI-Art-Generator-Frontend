import { Link, useLocation } from 'react-router-dom';
import logoMark from '../assets/logo-mark.png';
import useWaterRipple from '../hooks/useWaterRipple'; // The 3D water the footer now sits on

function Footer() {
  const { pathname } = useLocation();
  const rippleCanvasRef = useWaterRipple();

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
    // Pearl water: a soft light theme again — white washing into pale aqua — but cooler and
    // wetter than the original near-white wash. overflow-hidden clips the glow layers; every
    // decoration layer is aria-hidden and pointer-events-none.
    <footer className="relative overflow-hidden border-t border-brand-100 bg-gradient-to-b from-white via-brand-50/80 to-brand-100/70 text-slate-600">
      {/* Daylight sheen — one wide soft glow resting on the water. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[46rem] max-w-none -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
      {/* Two drifting glows reusing the page's blob animations (19s/29s periods never re-sync),
          tinted down to whisper level so they read as light on water, not lamps. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 animate-drift-slow rounded-full bg-brand-100/60 blur-3xl motion-reduce:animate-none" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-10 h-64 w-64 animate-drift-wide rounded-full bg-accent-100/70 blur-3xl motion-reduce:animate-none" />
      {/* A subtle under-glow keeps the wave realistic: the canvas is still transparent in the middle,
          but the footer gets a soft, pearly depth behind the content so the ripple feels like a real
          pond rather than a large animated overlay. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-4 bottom-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75),rgba(186,230,253,0.18)_35%,rgba(255,255,255,0)_70%)]" />
      {/* The water. useWaterRipple listens on this footer (every pointermove over the links
          bubbles up to it) and drops ripples that propagate and shade like lit water from the
          cursor's position. Reduced motion and test environments leave it a transparent sheet. */}
      <canvas ref={rippleCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Waterline — a hairline of teal light where the page meets the water. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent shadow-[0_0_12px_rgba(15,118,110,0.18)]" />
      {/* Brand block anchors the left, Features + Legal form a middle-right cluster.
          Was `[1.4fr_auto_auto]`: an `fr` column next to two `auto`s absorbs *all* the slack, so
          the link columns were pinned to the right edge with ~350px of dead space after the
          tagline. Three proportional columns instead — the links start just past the tagline,
          keeping a clear gap without hugging the edge, and gap-x-16 replaces the wide gap-x-24. */}
      {/* `relative z-10` lifts the content above the water canvas, which paints behind it. */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[2fr_1fr_1fr] lg:gap-x-16 lg:px-8">
        <div>
          <Link to="/home" onClick={(event) => handleFooterNavClick(event, '/home')} className="flex items-center gap-3">
            {/* Task 1: reuse the same circular brand mark as the header. A faint teal ring keeps
                it from sinking into the pearl wash without shouting. */}
            <img src={logoMark} alt="Ghibli AI logo" className="h-8 w-8 rounded-full object-cover ring-1 ring-brand-500/20" />
            <span className="font-heading text-2xl font-bold text-slate-900">Ghibli AI</span>
          </Link>
          {/* max-w-sm so the tagline wraps on its own terms instead of running toward the links.
              The original sunset gradient returns — it was designed against light, not dark. */}
          <p className="mt-3 max-w-sm bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-base font-semibold text-transparent drop-shadow-sm">
            Ignited by magic, crafted with cinematic artistry.
          </p>
        </div>

        {/* The old "Links" column (Home/Create/Features/Gallery/FAQ) was removed — the header
            already covers those routes, and this footer is now three tidy columns instead of
            two overlapping lists. */}

        <div>
          {/* No bullet marker in front of the heading — the plain dark heading keeps the light
              theme's hierarchy; the link list below carries the visual rhythm. */}
          <h3 className="text-xl font-semibold text-slate-900">Features</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* Were plain <li> text. The two generator links carry no onClick on purpose:
                handleFooterNavClick compares `pathname !== href` — which is always true for a
                `?tab=` link — and CreatePage reads the param itself, so the query must survive. */}
            {/* Back to the original `transition-colors duration-200` + `brand-600` hover — the
                palette that was designed for a light footer; the ripple supplies the drama. */}
            <li><Link to="/create?tab=photo" className="transition-colors duration-200 hover:text-brand-600">Photo to Ghibli Art</Link></li>
            <li><Link to="/create?tab=text" className="transition-colors duration-200 hover:text-brand-600">Text to Ghibli Art</Link></li>
            {/* Moved here from the deleted "Links" column: an overview link alongside the two
                specific generators it describes. */}
            <li><Link to="/features" onClick={(event) => handleFooterNavClick(event, '/features')} className="transition-colors duration-200 hover:text-brand-600">Features</Link></li>
          </ul>
        </div>

        <div>
          {/* Same as Features: heading without the dot marker. */}
          <h3 className="text-xl font-semibold text-slate-900">Legal</h3>
          <ul className="mt-2 space-y-1.5 text-base text-slate-600">
            {/* The two legal links pointed at /home before — there was no legal page at all. */}
            <li><Link to="/terms" onClick={(event) => handleFooterNavClick(event, '/terms')} className="transition-colors duration-200 hover:text-brand-600">Terms of Service</Link></li>
            <li><Link to="/privacy" onClick={(event) => handleFooterNavClick(event, '/privacy')} className="transition-colors duration-200 hover:text-brand-600">Privacy Policy</Link></li>
            {/* Moved here from the deleted "Links" column: FAQs are mostly policy answers, so
                they read naturally next to Terms and Privacy. */}
            <li><Link to="/faq" onClick={(event) => handleFooterNavClick(event, '/faq')} className="transition-colors duration-200 hover:text-brand-600">FAQ</Link></li>
          </ul>
        </div>
      </div>
      {/* Original small-print palette restored: the stone divider and slate text recede politely
          against the pearl water. */}
      <div className="relative z-10 border-t border-stone-300/60 py-4 text-center text-sm text-slate-500">
        <p>2026 Ghibli AI. All rights reserved.</p>
        <p className="mt-1 text-xs text-slate-400">Created by Suhan Singh Rathore</p>
      </div>
    </footer>
  );
}

export default Footer;