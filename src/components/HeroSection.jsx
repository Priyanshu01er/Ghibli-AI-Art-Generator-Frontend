function HeroSection() {
  return (
    // Vertical padding was 80px top / 112px bottom at every width, which on a 667px phone meant
    // the headline started a quarter of the way down the screen. Mobile-first, stepping up.
    // `relative` + `overflow-hidden` are new, purely to anchor and clip the two blobs below.
    <section className="relative overflow-hidden mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24" id="home">
      {/* The first viewport was a flat background behind three text blocks. Two blurred blobs in
          the CtaSection idiom give it depth without introducing an image or changing the theme;
          aria-hidden + pointer-events-none keep them out of the reading order and out of clicks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-16 -z-10 h-64 w-64 rounded-full bg-brand-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-24 -z-10 h-72 w-72 rounded-full bg-accent-300/40 blur-3xl"
      />
      {/* text-5xl (48px) as the base put "Transform Your Photos into" on three lines at 375px.
          One step down at the bottom, one extra step added at xl so the laptop size is unchanged. */}
      <h1 className="mx-auto max-w-5xl font-heading text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl">
        Transform Your Photos into
        <span className="block bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500 bg-clip-text text-transparent">
          Ghibli Art with Ghibli AI
        </span>
      </h1>
      {/* mt-8 → mt-5 on a phone, and the jump straight from 18px to 24px gets an lg stop. */}
      <p className="mx-auto mt-5 max-w-3xl text-base text-slate-600 sm:mt-8 sm:text-lg lg:text-2xl">
        Experience the magic of storybook-inspired artwork with a modern AI generator designed for expressive, cinematic visuals.
      </p>
      <a
        href="#create"
        className="btn-brand mt-8 sm:mt-10"
      >
        Try Ghibli AI
      </a>
      {/* Three facts the page otherwise only states much further down. `.glass-panel` is the
          existing frosted treatment, so this reads as part of the theme rather than a new widget.
          flex-wrap, because three chips at ~120px do not fit a 343px phone row. */}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600 sm:mt-10 sm:gap-3">
        <li className="glass-panel rounded-full px-4 py-2">Photo or text prompt</li>
        <li className="glass-panel rounded-full px-4 py-2">Six film-inspired styles</li>
        <li className="glass-panel rounded-full px-4 py-2">Results in seconds</li>
      </ul>
    </section>
  );
}

export default HeroSection;