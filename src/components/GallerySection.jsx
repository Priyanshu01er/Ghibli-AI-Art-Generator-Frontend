import { useEffect, useState } from 'react'; // State holds the clicked tile; effect binds Escape
import useImageLoaded from '../hooks/useImageLoaded'; // So a heavy photograph dissolves in rather than popping
import useRevealOnScroll, { REVEAL_DELAY } from '../hooks/useRevealOnScroll'; // Two groups here: the top row and the pair of cards
import prefersReducedMotion from '../utils/motionPreference'; // The lightbox skips its exit when motion is unwanted
import { styleLabel, typeLabel } from '../utils/generationLabels'; // Same wording as history cards
import animeSceneOne from '../assets/A1.png';
import animeSceneTwo from '../assets/A2.webp';
// The three files these lines used to import (0-2.webp, 802816d8…jpg, fe319a5c…webp) are no
// longer in src/assets, so the whole app failed to compile. O1–O3 are the intended pictures.
import galleryOne from '../assets/O1.jpg';
import galleryTwo from '../assets/O2.png';
import galleryThree from '../assets/O3.jpg';
import galleryFour from '../assets/OIP.png';
import mountainLakeOne from '../assets/ML1.jpg';
import mountainLakeTwo from '../assets/ML2.jpg';

/**
 * Every tile is an object now rather than a bare URL, because the popup needs more than an
 * image: a title and a `·`-separated meta line, exactly like `GenerationCard`'s lightbox.
 * `type` and `style` are the values the generator actually stores, so `typeLabel` and
 * `styleLabel` print the same words the Text-to-Art dropdown offers — one vocabulary across
 * the app. Pixel size is deliberately absent: it is read off the loaded <img> when the tile
 * is clicked, so there is nothing here to fall out of sync with the files themselves.
 */
const magicalGalleryItems = [
  {
    src: galleryOne,
    title: 'A walking castle drifting over the summer hills',
    type: 'TEXT_TO_IMAGE',
    style: 'fantasy_art',
  },
  {
    src: galleryTwo,
    title: 'Lantern-lit bathhouse town reflected in still water',
    type: 'TEXT_TO_IMAGE',
    style: 'cinematic',
  },
  {
    src: galleryThree,
    title: 'A pilot resting on a grounded starfighter in a wildflower meadow',
    type: 'TEXT_TO_IMAGE',
    style: 'digital_art',
  },
  {
    src: galleryFour,
    title: 'The Mountain Gateway to the Valley',
    type: 'IMAGE_TO_IMAGE',
    style: 'anime',
  },
];

const mountainLakeItems = [
  { src: mountainLakeOne, title: 'Rapeseed meadow under towering summer clouds', type: 'IMAGE_TO_IMAGE', style: 'anime' },
  { src: mountainLakeTwo, title: 'A quiet island gazebo on a glass-flat lake', type: 'IMAGE_TO_IMAGE', style: 'anime' },
];

const animeSceneItems = [
  { src: animeSceneOne, title: 'Straw-hat traveller on the clifftop path', type: 'IMAGE_TO_IMAGE', style: 'anime' },
  { src: animeSceneTwo, title: 'An adventurer watching the horizon above the clouds', type: 'IMAGE_TO_IMAGE', style: 'anime' },
];

/**
 * `import` gives a hashed URL like `/static/media/O1.7f3c…9b.jpg`, which would be a terrible
 * saved filename, so the download name is built from the title and only the real extension is
 * carried over from the URL. Mirrors `downloadFilename` in `utils/generationLabels`, which
 * cannot be reused as-is: these are static assets with no generation id.
 */
function galleryFilename({ title, src }) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const extension = /\.(\w+)(?:[?#]|$)/.exec(src)?.[1] ?? 'png';
  return `ghibli-gallery-${slug}.${extension}`;
}

/**
 * Shared by all eight tiles, so it is written once here instead of copied into four call sites.
 * `overflow-hidden` is what the hover zoom crops against. The transition is now scoped to
 * `box-shadow` alone — it used to be `transition-all` carrying both the reveal and the glow, which
 * meant the ring and the background transitioned for no reason and the reveal's stagger delayed the
 * glow. The reveal is an animation now, so this describes nothing but the hover: 200ms to bloom,
 * 500ms to fade, because a light that leaves as fast as it arrives reads as a switch.
 */
const TILE_BASE_CLASS =
  'overflow-hidden transition-shadow duration-500 ease-exit hover:shadow-glow hover:duration-200';

/** How long the popup's exit takes. Must match `panel-out`'s duration in tailwind.config.js. */
const LIGHTBOX_EXIT_MS = 200;

/**
 * One clickable tile. The <img> lives inside a button rather than carrying its own onClick, so
 * the tile is reachable by keyboard and announced as a control — the same shape the history
 * card uses for its image (`cursor-zoom-in`, `title="View full size"`).
 */
function GalleryTile({ item, onOpen, figureClassName, imageClassName }) {
  // The fade goes on the button, not the <img>: the image already owns `transition-transform` for
  // its zoom, and a second `transition-*` on the same element would silently replace it.
  const [imageRef, imageLoaded] = useImageLoaded();

  return (
    <figure className={`${TILE_BASE_CLASS} ${figureClassName}`}>
      <button
        type="button"
        // The <img> node is handed up rather than looked up by src: a selector built from a
        // hashed URL is fragile, and this is the exact element that was clicked.
        onClick={(event) => onOpen(item, event.currentTarget.querySelector('img'))}
        className={`group block h-full w-full cursor-zoom-in transition-opacity duration-700 ease-entrance motion-reduce:transition-none ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        title="View full size"
      >
        {/* `decoding="async"` is the cheapest real win on this page: these files are megabytes, and a
            synchronous decode blocks the main thread — including whichever reveal is mid-flight. */}
        <img ref={imageRef} src={item.src} alt={item.title} loading="lazy" decoding="async" className={imageClassName} />
      </button>
    </figure>
  );
}

function GallerySection() {
  // The clicked tile plus the pixel size measured from it; null means the popup is closed.
  const [activeItem, setActiveItem] = useState(null);
  // The popup used to vanish the instant it was dismissed, having faded in — an asymmetry that reads
  // as a bug. It now animates out, and this flag is what keeps the node mounted while it does.
  const [isClosing, setIsClosing] = useState(false);
  // Two reveal groups, because the two halves of this section are far enough apart vertically that
  // one observer would fire the lower half while it is still off screen.
  const [topRowRef, topShown] = useRevealOnScroll();
  const [cardsRef, cardsShown] = useRevealOnScroll();

  /** Every dismissal path goes through here, so the exit cannot be skipped by one of them. */
  const requestClose = () => {
    if (prefersReducedMotion()) {
      setActiveItem(null); // No animation to wait for
      return;
    }

    setIsClosing(true);
  };

  /** Unmounts the popup once its exit animation has played. */
  useEffect(() => {
    if (!isClosing) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setActiveItem(null);
      setIsClosing(false);
    }, LIGHTBOX_EXIT_MS);

    return () => clearTimeout(timer);
  }, [isClosing]);

  /** Escape closes the popup. Bound only while it is open, as in `GenerationCard`. */
  useEffect(() => {
    if (!activeItem) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeItem]);

  /**
   * The tile on screen is `object-cover` at a fixed height, so its box says nothing about the
   * file. `naturalWidth`/`naturalHeight` are the decoded pixel dimensions of the asset itself —
   * already loaded by the time anyone can click it, which is why no extra request is needed.
   */
  const handleOpen = (item, image) => {
    const dimensions =
      image?.naturalWidth && image?.naturalHeight
        ? `${image.naturalWidth}×${image.naturalHeight}`
        : null;

    setActiveItem({ ...item, dimensions });
  };

  /** An anchor with `download`, same as the history card — works for a static asset URL too. */
  const handleDownload = () => {
    if (!activeItem) {
      return;
    }

    const link = document.createElement('a');
    link.href = activeItem.src;
    link.download = galleryFilename(activeItem);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="gallery" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <h2 className="text-center font-heading text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
        Magical Transformations Gallery
      </h2>
      <div ref={topRowRef} className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
        {magicalGalleryItems.map((item, index) => (
          <GalleryTile
            key={item.src}
            item={item}
            onOpen={handleOpen}
            /* Four tiles dealt left to right, 80ms apart. An `animation-delay` now, so — unlike the
               `delay-*` class it replaces — it cannot reach the hover glow declared above. */
            figureClassName={`rounded-2xl bg-white shadow-card ring-1 ring-stone-200 ${
              topShown ? `animate-rise-in ${REVEAL_DELAY[index]} motion-reduce:animate-none` : 'opacity-0'
            }`}
            /* h-44 on a phone: at h-56 a single-column stack of four tiles was ~900px of
               scrolling before the next section. */
            /* Fast in, slow out: the zoom answers a pointer in 300ms and unwinds over 700ms. One
               symmetric 700ms in both directions is what made this feel like syrup. */
            imageClassName="h-44 w-full object-cover transition-transform duration-700 ease-exit group-hover:scale-110 group-hover:duration-300 group-hover:ease-entrance sm:h-52 lg:h-56"
          />
        ))}
      </div>

      <div ref={cardsRef} className="mt-10 grid gap-6 lg:grid-cols-2">
        <article
          /* `transition-all duration-700` is gone: nothing on this panel hovers, so the reveal
             animation is now its only motion — a transition here described nothing. */
          className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6 lg:p-8 ${
            cardsShown ? 'animate-rise-in motion-reduce:animate-none' : 'opacity-0'
          }`}
        >
          {/* `whitespace-nowrap` is removed rather than gated at a breakpoint: this string is
              ~380px wide at text-2xl but the card has only 279px inside it on a 375px phone, so
              it pushed the document wider than the viewport and the whole page scrolled
              sideways. No breakpoint makes nowrap safe — even at lg the card is ~416px against
              a ~480px text-3xl string. It scales and wraps instead. */}
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
            Nature Ghibli Style
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* These four were plain <img> tags; they go through the same tile so all eight
                pictures in this section open the popup, not just the top row. */}
            {mountainLakeItems.map((item) => (
              <GalleryTile
                key={item.src}
                item={item}
                onOpen={handleOpen}
                /* No reveal classes on the inner tiles: they are already inside a block that
                   reveals, and animating them again would fade a fade. */
                figureClassName="rounded-xl"
                imageClassName="h-40 w-full object-cover transition-transform duration-700 ease-exit group-hover:scale-110 group-hover:duration-300 group-hover:ease-entrance sm:h-44 lg:h-52"
              />
            ))}
          </div>
        </article>
        <article
          /* Same nowrap overflow as the card above, same fix — and the same reveal, one beat behind
             on an `animation-delay` rather than the `delay-100` class. */
          className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6 lg:p-8 ${
            cardsShown ? 'animate-rise-in [animation-delay:120ms] motion-reduce:animate-none' : 'opacity-0'
          }`}
        >
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
            Studio Ghibli Scene
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {animeSceneItems.map((item) => (
              <GalleryTile
                key={item.src}
                item={item}
                onOpen={handleOpen}
                figureClassName="rounded-xl"
                imageClassName="h-40 w-full object-cover transition-transform duration-700 ease-exit group-hover:scale-110 group-hover:duration-300 group-hover:ease-entrance sm:h-44 lg:h-52"
              />
            ))}
          </div>
        </article>
      </div>

      {/* Same lightbox vocabulary as `GenerationCard`: z-[60] clears the sticky header at
          z-50, a click on the backdrop closes, and the panel stops that click. */}
      {activeItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery sample"
          onClick={requestClose}
          /* The backdrop dissolves in over 180ms and the panel scales up from 0.97 — and now leaves
             the same way. It used to fade in and then vanish on one frame, an asymmetry that reads
             as a bug rather than a dismissal. */
          className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm motion-reduce:animate-none ${
            isClosing ? 'animate-fade-out' : 'animate-fade-in'
          }`}
        >
          <div
            /* `panel-out` is `forwards`: the panel must hold its final, faded frame for the rest of
               the 200ms rather than snapping back to full opacity before it unmounts. */
            className={`max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-4 shadow-card motion-reduce:animate-none sm:p-5 ${
              isClosing ? 'animate-panel-out' : 'animate-panel-in'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* object-contain, unlike the cropped tile: the popup shows the whole picture. */}
            <img
              src={activeItem.src}
              alt={activeItem.title}
              className="mx-auto max-h-[70vh] w-full rounded-xl object-contain"
            />

            <p className="mt-4 text-base font-semibold text-slate-900">{activeItem.title}</p>
            {/* filter(Boolean) so an unmeasured image drops the size instead of printing an
                empty segment between two dots. */}
            <p className="mt-1 text-sm text-slate-500">
              {[typeLabel(activeItem.type), styleLabel(activeItem.style, activeItem.type), activeItem.dimensions]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                /* Same fast-in/slow-out pair as every other lift on the page, so the popup's primary
                   action behaves like the CTAs rather than snapping at Tailwind's default 150ms. */
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle"
              >
                Download
              </button>
              <button
                type="button"
                onClick={requestClose} // Third dismissal path, same exit as Escape and the backdrop
                className="flex-1 rounded-xl border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GallerySection;

