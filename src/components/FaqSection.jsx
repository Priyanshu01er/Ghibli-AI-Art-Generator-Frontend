import { faqItems } from '../data/homeData';
import useRevealOnScroll, { REVEAL_DELAY } from '../hooks/useRevealOnScroll'; // This section had no motion at all

/**
 * The only card grid on the homepage that used to sit perfectly still, wedged between two animated
 * sections — which read as a dead zone rather than as calm. It now gets the same treatment as
 * `FeaturesSection`: one observer on the grid, four staggered arrivals, and a glow on hover.
 */
function FaqSection() {
  const [gridRef, shown] = useRevealOnScroll();

  return (
    <section id="faq" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <h2 className="text-center font-heading text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
        Frequently Asked Questions about Ghibli AI
      </h2>
      <div ref={gridRef} className="mt-8 grid gap-4 md:grid-cols-2">
        {faqItems.map((faq, index) => (
          <article
            key={faq.question}
            /* Shadow only — and that covers the ring too, because Tailwind's `ring-*` is itself a
               box-shadow. Fast in, slow out: 200ms to bloom, 500ms to let go. */
            className={`rounded-2xl bg-white p-6 shadow-card ring-1 ring-stone-200 transition-shadow duration-500 ease-exit hover:shadow-glow hover:ring-brand-100 hover:duration-200 ${
              shown ? `animate-rise-in ${REVEAL_DELAY[index]} motion-reduce:animate-none` : 'opacity-0'
            }`}
          >
            <h3 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{faq.question}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{faq.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FaqSection;