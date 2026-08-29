import { useState } from 'react'; // Holds which of the four quotes currently owns the large panel
import { ghibliQuotes } from '../data/homeData'; // Copy lives with every other home section's data
// H1–H4 are the four landscape assets added for this section. Imported here, not in homeData,
// so the URLs stay build-time constants and the data module has no bundler side effects.
import inspirationForest from '../assets/H1.png';
import inspirationFlight from '../assets/H2.jpg';
import inspirationWind from '../assets/H3.jpg';
import inspirationWater from '../assets/H4.jpg';

/** `asset` key → resolved URL, so `homeData` never has to know about the bundler. */
const IMAGE_SOURCES = {
  H1: inspirationForest,
  H2: inspirationFlight,
  H3: inspirationWind,
  H4: inspirationWater,
};

/** Id → entry, so the display order below can be a list of ids instead of copied objects. */
const QUOTES_BY_ID = new Map(ghibliQuotes.map((item) => [item.id, item]));
/** Ids in display order: index 0 is the large panel, 1–3 are the small tiles beside it. */
const INITIAL_ORDER = ghibliQuotes.map((item) => item.id);

/**
 * "Whispers of the Wind" — the quiet beat between the product story and the FAQ.
 *
 * Deliberately not a second gallery: `GallerySection` owns the click-to-enlarge interaction and
 * exists to prove output quality, while this section exists to set a mood. Duplicating the
 * lightbox here would blur what each one is for, so every image is decorative and inert.
 *
 * Sizing is the trap this file avoids: all four assets are landscape, so they are constrained by
 * a fixed height plus `object-cover` rather than by their own aspect ratio — the same reason
 * `GallerySection` dropped `whitespace-nowrap` after it pushed the page sideways on a phone.
 */
function InspirationSection() {
  // Only the arrangement is state; `ghibliQuotes` itself is never mutated, so the caption row
  // and the panels always read the same four entries.
  const [order, setOrder] = useState(INITIAL_ORDER);

  /**
   * Clicking a small tile swaps it with the large panel — a true swap, not "move to front": the
   * outgoing featured entry lands in the exact slot the clicked tile just vacated, so the other
   * two tiles keep their places instead of shuffling down.
   */
  const swapWithFeatured = (id) => {
    setOrder((current) => {
      const index = current.indexOf(id);

      if (index < 1) {
        return current; // Already featured (or an unknown id): nothing to swap
      }

      const next = [...current];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  };

  const arranged = order.map((id) => QUOTES_BY_ID.get(id)); // Ids back to entries, in view order
  const [featured, ...tiles] = arranged; // First gets the large panel, the rest the row

  return (
    // `overflow-hidden` is not cosmetic: the blob below hangs past the right edge, and without
    // clipping it here it widens the document itself and the whole page scrolls sideways — the
    // same class of bug as the `whitespace-nowrap` overflow fixed in GallerySection.
    <section id="inspiration" className="relative overflow-hidden mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      {/* One blurred blob, in the CtaSection idiom. pointer-events-none so it cannot eat a click,
          and -z-10 so it sits behind the cards rather than washing them out. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-8 -z-10 h-64 w-64 rounded-full bg-accent-300/40 blur-3xl"
      />

      <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
        Whispers of the Wind
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-500 sm:text-lg">
        Landscapes and lines that shaped the look we generate — a moment of quiet before you make
        your own.
      </p>

      <div className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-3">
        {/* The featured panel spans two of three columns on lg and is taller, so the row below
            reads as supporting material rather than as four equal tiles. */}
        <figure className="group relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-200 lg:col-span-2">
          <img
            src={IMAGE_SOURCES[featured.asset]}
            alt={featured.alt}
            loading="lazy"
            className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-110 sm:h-80 lg:h-full lg:min-h-[420px]"
          />
          {/* A scrim, not a solid bar: the quote needs contrast at the bottom while the top of
              the picture stays untouched. */}
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-5 sm:p-7">
            <blockquote className="font-heading text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-3xl">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <p className="mt-2 text-sm font-medium text-accent-100 sm:text-base">— {featured.attribution}</p>
          </figcaption>
        </figure>

        {/* Stacked beside the panel on lg, a plain stack below it on smaller screens — three
            landscape crops side by side on a phone would each be ~100px wide. */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          {tiles.map((item) => (
            <figure
              key={item.id}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-200"
            >
              <img
                src={IMAGE_SOURCES[item.asset]}
                alt={item.alt}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-110 sm:h-40 lg:h-[128px]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent px-4 py-3">
                <p className="text-sm font-semibold leading-snug text-white">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-0.5 text-xs font-medium text-accent-100">— {item.attribution}</p>
              </figcaption>
              {/* The control is an overlay rather than a wrapper around the image: `group` has to
                  stay on the <figure> for the existing hover zoom to keep working, and covering
                  the caption too means the whole tile is clickable. Keyboard-reachable, with the
                  quote in the label because the picture alone does not say what will change. */}
              <button
                type="button"
                onClick={() => swapWithFeatured(item.id)}
                title="Show this one in the large panel"
                className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <span className="sr-only">Swap &ldquo;{item.quote}&rdquo; into the large panel</span>
              </button>
            </figure>
          ))}
        </div>
      </div>

      {/* The captions, kept out of the images: overlaying two lines of text on a 128px-tall crop
          leaves nothing of the picture, so the mood line for each tile lives underneath.
          Ordered by `arranged`, not `ghibliQuotes`, so a swap moves a caption with its image. */}
      <ul className="mt-8 grid gap-3 text-center text-sm text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
        {arranged.map((item) => (
          <li key={item.id} className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-stone-200">
            {item.caption}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default InspirationSection;
