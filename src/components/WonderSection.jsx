import useTilt from '../hooks/useTilt';
import useParallax from '../hooks/useParallax';
import useImageLoaded from '../hooks/useImageLoaded'; // Each postcard dissolves in as its pixels arrive
import useRevealOnScroll, { revealDelay } from '../hooks/useRevealOnScroll'; // One observer, staggered tiles
import { wonderScenes } from '../data/homeData'; // Copy lives with every other home section's data
// Z1"Z6 are the six assets added for this section. Imported here " not in homeData " so the data
// module stays free of bundler side effects, the same rule InspirationSection follows for H1"H4.
import wonderLakehouse from '../assets/Z1.jpg';
import wonderIsland from '../assets/Z2.jpg';
import wonderFields from '../assets/Z3.png';
import wonderCottage from '../assets/Z4.png';
import wonderMoss from '../assets/Z5.jpg';
import wonderMeadow from '../assets/Z6.png';

/** `asset` key -> resolved URL, so `homeData` never has to know about the bundler. */
const IMAGE_SOURCES = {
  Z1: wonderLakehouse,
  Z2: wonderIsland,
  Z3: wonderFields,
  Z4: wonderCottage,
  Z5: wonderMoss,
  Z6: wonderMeadow,
};

/**
 * One postcard in the mosaic. A component rather than inline JSX because it owns the
 * `useImageLoaded` hook, and hooks cannot be called from inside a `.map()` body " the same
 * reason `InspirationPicture` exists next door.
 */
function WonderCard({ scene, className, revealClass }) {
  const tiltRef = useTilt();
  const [imageRef, imageLoaded] = useImageLoaded();

  return (
    <figure
      ref={tiltRef} className={`group relative overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200 transition-shadow duration-500 ease-exit hover:shadow-glow hover:duration-200 ${revealClass} ${className}`}
    >
      {/* `develop-in` touches only opacity + filter, so it cannot fight the hover zoom's
          `transition-transform` " the pairing InspirationSection already documents.
          `imageFocus` lets a tile override the centre crop (Z2 anchors to its bottom, so the
          island house survives the crop); every other tile keeps `object-center`. */}
      <img
        ref={imageRef}
        src={IMAGE_SOURCES[scene.asset]}
        alt={scene.alt}
        loading="lazy" // Six heavy frames " none of them load until the section is reached
        decoding="async"
        className={`h-full w-full object-cover ${scene.imageFocus ?? 'object-center'} transition-transform duration-700 ease-exit group-hover:scale-110 group-hover:duration-300 group-hover:ease-entrance motion-reduce:animate-none ${
          imageLoaded ? 'animate-develop-in' : 'opacity-0'
        }`}
      />
      {/* Caption overlay: the InspirationSection scrim idiom, so words stay legible on any sky. */}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/25 to-transparent px-4 pb-3 pt-10 sm:px-5">
        <p className="text-sm font-semibold text-white sm:text-base">{scene.title}</p>
        <p className="mt-0.5 text-xs font-medium text-accent-100 sm:text-sm">{scene.caption}</p>
      </figcaption>
    </figure>
  );
}

/**
 * "Postcards from worlds that began as words" " the scenery beat between the FAQ and the
 * closing CTA. The brief it answers: the page ended too soon, and Z1"Z6 needed a home that
 * absorbs their very different shapes instead of cropping them into uniform tiles.
 *
 * The layout is a 12-column mosaic. Five of the six pictures are landscape and one (Z2) is a
 * tall portrait, so on desktop Z2 row-spans two rows beside the opening pair instead of being
 * letterboxed, and Z5 " by far the widest frame " closes the section as a full-width banner.
 * On smaller screens the grid steps down to a simple two-column stack, so nothing is ever
 * cropped past recognition.
 *
 * Motion is the site's existing vocabulary, nothing new: one reveal observer staggers the
 * tiles in (`rise-in` + `revealDelay`), each picture dissolves in off its own load
 * (`develop-in` via `useImageLoaded`), every tile zooms gently under the pointer, and two
 * ambient blobs drift behind everything (`drift-slow` / `drift-wide`, the HeroSection idiom).
 * Every animated element carries `motion-reduce:animate-none`.
 */
function WonderSection() {
  const [blob1Ref, blob1Offset] = useParallax(0.12);
  const [blob2Ref, blob2Offset] = useParallax(-0.08);
  const [gridRef, gridShown] = useRevealOnScroll();

  // Each tile's arrival: revealed off the shared observer, staggered by grid position.
  // `revealDelay` clamps at its last rung, so the banner and the closing line land as one finale.
  const reveal = (index) =>
    gridShown ? `animate-card-flip-in ${revealDelay(index)} motion-reduce:animate-none` : 'opacity-0';

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* Two ambient blobs in the HeroSection/CtaSection idiom " depth without a new token.
          aria-hidden + pointer-events-none keep them out of reading order and out of clicks. */}
      <div
        aria-hidden="true"
        ref={blob1Ref} style={{ translate: `0 ${blob1Offset}px` }} className="pointer-events-none absolute -right-24 top-16 -z-10 h-64 w-64 animate-drift-wide rounded-full bg-brand-100/70 blur-3xl motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        ref={blob2Ref} style={{ translate: `0 ${blob2Offset}px` }} className="pointer-events-none absolute -left-24 bottom-32 -z-10 h-72 w-72 animate-drift-slow rounded-full bg-accent-300/40 blur-3xl [animation-delay:-6s] motion-reduce:animate-none"
      />

      <div ref={gridRef}>
        {/* The section arrives as one group " chip, headline, lede " then the tiles stagger in
            behind it, which reads as a title card before a gallery wall. */}
        <div className={`text-center motion-reduce:animate-none ${reveal(0)}`}>
          <span className="glass-panel inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-brand-700">
            Painted with Ghibli AI
          </span>
          <h2 className="mt-4 font-heading text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
            Postcards from worlds that began as words
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Every scene below started the same way yours will " one sentence, typed into a box,
            and a short wait. Scroll slowly: in each frame, the light is doing something.
          </p>
        </div>

        {/* The mosaic. Spans per tile: Z2 (the lone portrait) row-spans beside the opening pair,
            Z3 sits at four columns, and Z5 - the widest frame of the six - closes full width.
            Fixed heights per breakpoint keep the rows calm while `object-cover` absorbs the
            leftover aspect-ratio differences. Each card now has a unique reveal stagger index
            to ensure proper sync order, especially the last image which previously appeared late. */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
          {/* Card 1: Z1 (lakehouse) - reveal(1) - 60ms delay */}
          <WonderCard scene={wonderScenes[0]} revealClass={reveal(1)} className="h-64 w-full sm:col-span-2 sm:h-72 lg:col-span-7 lg:h-80" />
          {/* Card 2: Z2 (island) - reveal(2) - 130ms delay. Portrait that row-spans rows 1-2.
              `lg:h-full` was a trap here: against auto-sized grid rows a percentage height falls back
              to the <img>'s intrinsic height, which inflated BOTH rows and left the dead gaps beside Z1
              and Z3. A hard 660px = h-80 (320) + gap-5 (20) + h-80 (320) keeps each row at its fixed
              height and lands Z2's bottom edge exactly on Z3's - no maths left to drift out of sync. */}
          <WonderCard scene={wonderScenes[1]} revealClass={reveal(2)} className="h-96 w-full sm:col-span-1 lg:col-span-5 lg:row-span-2 lg:h-[660px]" />
          {/* Card 3: Z4 (cottage) - reveal(3) - 210ms delay */}
          <WonderCard scene={wonderScenes[2]} revealClass={reveal(3)} className="h-64 w-full sm:col-span-1 sm:h-72 lg:col-span-7 lg:h-80" />
          {/* Card 4: Z3 (fields) - reveal(4) - 300ms delay */}
          <WonderCard scene={wonderScenes[3]} revealClass={reveal(4)} className="h-80 w-full sm:col-span-1 lg:col-span-4 lg:h-80" />
          {/* Card 5: Z6 (meadow) - reveal(5) - 400ms delay */}
          <WonderCard scene={wonderScenes[4]} revealClass={reveal(5)} className="h-64 w-full sm:col-span-1 sm:h-72 lg:col-span-8 lg:h-80" />
          {/* Card 6: Z5 (moss / "The world after rain") - reveal(6) - 500ms delay. Full-width banner.
              FIXED: Previously used reveal(5) same as card above, causing it to appear too late.
              Now has unique stagger timing so it arrives in proper sequence. */}
          <WonderCard scene={wonderScenes[5]} revealClass={reveal(6)} className="h-64 w-full sm:col-span-2 sm:h-72 lg:col-span-12 lg:h-[420px]" />
        </div>

        {/* The bridge to the CTA: closing line uses reveal(7) - 600ms delay, so the section hands
            the page back to the invitation below with final punctuation. All 8 elements now follow
            proper cascade timing for perfectly synced appearance. */}
        <p
          className={`mt-10 text-center text-lg font-semibold text-slate-700 motion-reduce:animate-none sm:text-xl ${
            reveal(7)
          }`}
        >
          Six sentences. Six worlds. The next one is yours to type.
        </p>
      </div>
    </section>
  );
}

export default WonderSection;
