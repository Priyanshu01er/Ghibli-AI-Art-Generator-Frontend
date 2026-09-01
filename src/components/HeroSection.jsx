import useParallax from '../hooks/useParallax';
import useMagnet from '../hooks/useMagnet';
import HeroHeadline from './HeroHeadline'; // The h1, now typed in character by character

function HeroSection() {
  const [blob1Ref, blob1Offset] = useParallax(0.25) // Faster drift: blobs recede more noticeably on scroll for depth;
  const [blob2Ref, blob2Offset] = useParallax(-0.18) // Negative: this blob moves ahead of the scroll for counter-drift;
  const magnetRef = useMagnet();
  return (
    // Vertical padding was 80px top / 112px bottom at every width, which on a 667px phone meant
    // the headline started a quarter of the way down the screen. Mobile-first, stepping up.
    // `relative` + `overflow-hidden` are new, purely to anchor and clip the two blobs below.
    <section className="relative overflow-hidden mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24" id="home">
      {/* The first viewport was a flat background behind three text blocks. Two blurred blobs in
          the CtaSection idiom give it depth without introducing an image or changing the theme;
          aria-hidden + pointer-events-none keep them out of the reading order and out of clicks.
          Two *different* paths now — 19s and 23s, with a scale breath — because a single shared
          18s loop made every blob on the page re-sync every 18s, which is a heartbeat. */}
      <div
        aria-hidden="true"
        ref={blob1Ref}
        style={{ translate: `0 ${blob1Offset}px` }}
        className="pointer-events-none absolute -left-24 -top-16 -z-10 h-64 w-64 animate-drift-slow rounded-full bg-brand-100/70 blur-3xl motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        // `drift-alt` traces three waypoints rather than one line out and back, and the negative
        // delay drops it mid-path — two blobs moving in lockstep read as the page itself wobbling.
        ref={blob2Ref}
        style={{ translate: `0 ${blob2Offset}px` }}
        className="pointer-events-none absolute -right-20 top-24 -z-10 h-72 w-72 animate-drift-alt rounded-full bg-accent-300/40 blur-3xl [animation-delay:-9s] motion-reduce:animate-none"
      />
      {/* Moved into its own component, unchanged in wording, sizing and colour: the typing
          animation re-renders on every keystroke, and there is no reason for the paragraph, the
          button and the pills below to re-render with it. */}
      <HeroHeadline />
      {/* mt-8 → mt-5 on a phone, and the jump straight from 18px to 24px gets an lg stop. */}
      {/* Everything below the headline used to stand fully formed around a line that was still
          typing itself. It now arrives in order while the headline types — no observer, because
          this is the first screen and there is nothing to wait for. */}
      <p className="mx-auto mt-5 max-w-3xl animate-rise-in text-base text-slate-600 [animation-delay:120ms] motion-reduce:animate-none sm:mt-8 sm:text-lg lg:text-2xl">
        Experience the magic of storybook-inspired artwork with a modern AI generator designed for expressive, cinematic visuals.
      </p>
      <a
        href="#create"
        // `soft-in` (opacity only), not `rise-in`: `.btn-brand:hover` lifts this element, and a
        // transform in the entrance would be the thing that keyframe animation outranks.
        ref={magnetRef}
        style={{ translate: "var(--magnet-x, 0) var(--magnet-y, 0)" }}
        className="btn-brand mt-8 animate-soft-in [animation-delay:240ms] motion-reduce:animate-none sm:mt-10"
      >
        Try Ghibli AI
      </a>
      {/* Three facts the page otherwise only states much further down. `.glass-panel` is the
          existing frosted treatment, so this reads as part of the theme rather than a new widget.
          flex-wrap, because three chips at ~120px do not fit a 343px phone row. */}
      {/* 80ms apart, last in the sequence: the chips are the least important thing here, so they
          settle after the sentence and the button have already landed. */}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600 sm:mt-10 sm:gap-3">
        <li className="glass-panel animate-rise-in rounded-full px-4 py-2 [animation-delay:360ms] motion-reduce:animate-none">Photo or text prompt</li>
        <li className="glass-panel animate-rise-in rounded-full px-4 py-2 [animation-delay:440ms] motion-reduce:animate-none">Six film-inspired styles</li>
        <li className="glass-panel animate-rise-in rounded-full px-4 py-2 [animation-delay:520ms] motion-reduce:animate-none">Results in seconds</li>
      </ul>
    </section>
  );
}

export default HeroSection;