import { featureCards } from '../data/homeData';
import useRevealOnScroll, { REVEAL_DELAY } from '../hooks/useRevealOnScroll'; // One observer for the whole three-card row, one shared stagger

const featureIcons = [
  (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
        className="stroke-brand-600"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" className="stroke-brand-600" strokeWidth="1.8" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        className="stroke-brand-600"
        strokeWidth="1.8"
      />
      <path
        d="m8 14 2.5-2.5a1 1 0 0 1 1.4 0L16 16"
        className="stroke-brand-600"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1" className="fill-brand-600" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 3 13.6 7.4 18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
        className="stroke-brand-600"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 14.5 19.3 16.7 21.5 17.5l-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
        className="stroke-brand-600"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
];

/**
 * The stagger and the observer now come from the same module, and the stagger is an `animation-delay`
 * rather than a `delay-*` class. That matters here: a `delay-*` class delays the element's
 * *transitions* as well, so the hover lift used to need a `hover:delay-0` counter-class to start on
 * time — and still crawled back late, because un-hovering restored the base delay. An animation delay
 * cannot reach a transition at all, so the hover below needs no defending.
 */
function FeaturesSection() {
  const [gridRef, shown] = useRevealOnScroll(); // The grid is the group; the cards inherit its moment

  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">Ghibli AI Features</h2>
      <div ref={gridRef} className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3">
        {featureCards.map((card, index) => (
          <article
            key={card.title}
            // Back to `transition-transform` from the `transition-all` the old transition-based
            // reveal forced: opacity is the animation's business now, and this element's only
            // transition is the lift. Fast in, slow out — a real object answers a pointer at once
            // and takes its time settling back.
            className={`group rounded-2xl bg-white p-6 shadow-card ring-1 ring-stone-200 transition-transform duration-500 ease-exit hover:-translate-y-1 hover:duration-200 hover:ease-settle sm:p-8 ${
              shown ? `animate-rise-in ${REVEAL_DELAY[index]} motion-reduce:animate-none` : 'opacity-0'
            }`}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-500 ease-exit group-hover:scale-110 group-hover:duration-200 group-hover:ease-settle sm:mb-5">
              {featureIcons[index]}
            </div>
            {/* text-3xl was the worst offender on a phone: 30px card titles in a stack read as
                section headings rather than card headings. */}
            <h3 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{card.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-slate-600 sm:mt-4 sm:text-lg">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FeaturesSection;