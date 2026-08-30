import photoToGhibliImage from '../assets/P1.png';
import useImageLoaded from '../hooks/useImageLoaded'; // P1.png is ~10MB; it must not pop in
import useRevealOnScroll from '../hooks/useRevealOnScroll'; // The words arrive, then the artwork

function DetailSection() {
  // One observer for the whole two-column row: the ref goes on the <section>, which is the only
  // element that contains both columns.
  const [sectionRef, shown] = useRevealOnScroll();
  const [artworkRef, artworkLoaded] = useImageLoaded(); // Drives the fade on the clip wrapper below

  return (
    <section
      ref={sectionRef}
      className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-10 lg:px-8"
    >
      {/* The `transition-all duration-700` that used to sit here is gone: this column has no hover,
          so the reveal animation is the only motion it needs. */}
      <div className={shown ? 'animate-rise-in motion-reduce:animate-none' : 'opacity-0'}>
        <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">Photo to Ghibli Art</h2>
        {/* This paragraph is ~90 words; at text-lg it filled most of a phone screen on its own. */}
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg lg:text-xl">
          Transform any photo into beautiful Studio Ghibli-style artwork with our Ghibli AI. Simply upload your image and
          describe elements you want to enhance - mood, scene setting, character details - and our advanced Ghibli image
          generator will craft a complete transformation that captures the iconic Ghibli art aesthetic that Studio Ghibli
          fans love.
        </p>
        <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Simple Ghibli AI Prompting</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Use everyday language to guide the Studio Ghibli transformation with our Ghibli generator. No artistic
              background required. Our Ghibli AI translates your vision into perfect Ghibli art imagery with authentic Studio
              Ghibli qualities.
            </p>
          </li>
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Ghibli Art Style Control</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Select specific Studio Ghibli film influences like 'Spirited Away,' 'Howl's Moving Castle,' or 'My Neighbor
              Totoro' with our Ghibli image generator to customize your Ghibli artwork's aesthetic to your exact preferences.
            </p>
          </li>
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Ghibli Character Integration</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Our Ghibli AI can seamlessly integrate your pets or family members into the Studio Ghibli universe, maintaining
              their recognizable features while giving them distinctive Ghibli art charm in every Ghibli image we generate.
            </p>
          </li>
        </ul>
      </div>

      {/* Grid items stretch by default, so dropping the old lg:max-h-[680px] cap lets this
          figure grow to the full row height. The artwork's bottom edge now lines up with the
          bottom of the "Ghibli Character Integration" card instead of stopping short. */}
      <div
        /* 120ms of `animation-delay`, replacing the old `delay-150` transition: the artwork follows
           the words rather than racing them, and nothing on this element transitions any more. */
        className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-amber-200 via-orange-100 to-orange-300 p-3 shadow-card sm:p-4 ${
          shown ? 'animate-rise-in [animation-delay:120ms] motion-reduce:animate-none' : 'opacity-0'
        }`}
      >
        {/* A second clip inside the amber frame, purely for the pan below: the 1.06 scale would
            otherwise spill over the p-3 padding and swallow the border this section is built on. */}
        {/* It doubles as the load fade's target — the <img> itself cannot carry it, because a
            `transition-opacity` there would replace nothing useful today but collides the moment
            this picture is given a hover. The wrapper is the safe place for it. */}
        <div
          className={`h-full overflow-hidden rounded-2xl transition-opacity duration-700 ease-entrance motion-reduce:transition-none ${
            artworkLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* lg:h-full stretches the artwork through the now taller wrapper; object-cover crops
              the sides gracefully instead of distorting the art. `animate-ken-burns` pans it over
              32s — slow enough that nobody catches it moving, just enough that it is not a
              screenshot. Composited transform only, so the picture never re-decodes. */}
          {/* `decoding="async"` matters most here of anywhere on the page: a synchronous decode of a
              ~10MB PNG on the main thread would stall whatever reveal is mid-flight. */}
          <img
            ref={artworkRef}
            src={photoToGhibliImage}
            alt="Main showcase"
            loading="lazy"
            decoding="async"
            className="h-64 w-full animate-ken-burns rounded-2xl object-cover motion-reduce:animate-none sm:h-80 lg:h-full"
          />
        </div>
      </div>
    </section>
  );
}

export default DetailSection;