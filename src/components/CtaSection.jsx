import { Link } from 'react-router-dom';

function CtaSection() {
  return (
    <section id="create" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      {/* py-20 (160px of vertical padding) around three short lines meant the panel needed most
          of a phone screen to say very little. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-100 via-white to-accent-100 px-5 py-14 text-center shadow-card ring-1 ring-brand-100 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="pointer-events-none absolute -left-24 -top-20 h-56 w-56 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-accent-300/50 blur-3xl" />
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