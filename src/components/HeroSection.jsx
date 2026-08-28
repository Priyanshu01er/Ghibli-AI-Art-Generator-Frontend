function HeroSection() {
  return (
    // Vertical padding was 80px top / 112px bottom at every width, which on a 667px phone meant
    // the headline started a quarter of the way down the screen. Mobile-first, stepping up.
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24" id="home">
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
    </section>
  );
}

export default HeroSection;