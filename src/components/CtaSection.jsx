import { Link } from 'react-router-dom';
import useRevealOnScroll from '../hooks/useRevealOnScroll'; // Fades the panel up the first time it is reached

function CtaSection() {
  const [panelRef, shown] = useRevealOnScroll(); // The ref goes on the panel itself — one group, one observer

  return (
    <section id="create" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      {/* py-20 (160px of vertical padding) around three short lines meant the panel needed most
          of a phone screen to say very little. */}
      <div
        ref={panelRef}
        // `transition-all duration-700 ease-out` is gone: the reveal is a CSS animation now, and
        // nothing else on this panel transitions, so the utility described nothing.
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-100 via-white to-accent-100 px-5 py-14 text-center shadow-card ring-1 ring-brand-100 sm:px-8 sm:py-16 lg:px-10 lg:py-20 ${
          shown ? 'animate-rise-in motion-reduce:animate-none' : 'opacity-0'
        }`}
      >
        {/* Two different paths at two different periods (29s and 19s), not one shared 18s loop with
            a phase offset: two circles tracing the same line in step is what made the ambient layer
            read as a pulse. They also breathe now — scale 1 → 1.1 — so the light shifts, not just
            slides. */}
        <div className="pointer-events-none absolute -left-24 -top-20 h-56 w-56 animate-drift-wide rounded-full bg-brand-100/70 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 animate-drift-slow rounded-full bg-accent-300/50 blur-3xl [animation-delay:-6s] motion-reduce:animate-none" />
        <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Create Your Magical Artwork Today</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base text-slate-600 sm:mt-6 sm:text-lg lg:text-xl">
          Ignite your imagination with Ghibli AI and transform everyday life into extraordinary cinematic adventures.
        </p>
        <Link to="/create" className="btn-brand mt-8 inline-flex sm:mt-10">
          Try Ghibli AI For Free
        </Link>
      </div>
    </section>
  );
}

export default CtaSection;