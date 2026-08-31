/**
 * The placeholder cards a generation grid shows while its metadata is in flight.
 *
 * Extracted because this markup existed **twice, verbatim** — once for the six cards a history page
 * holds and once for the four on the homepage — and the two copies had already started to matter: the
 * whole point of the change below is that the count is the only difference between them.
 *
 * That change is the stagger. Six placeholders on a bare `animate-pulse` share one clock, so they
 * breathe as a single organism: the page-wide heartbeat the first motion pass spent its effort taking
 * *out* of the background blobs, put back in the foreground. Offsetting each card by a fraction of the
 * 2s pulse period makes the same six read as a surface waiting rather than a machine ticking.
 */

/**
 * A fifth of `animate-pulse`'s 2s period, so six cards spread across a little over half of one cycle —
 * far enough apart to break the lockstep, near enough that they still look like one group.
 *
 * Written out in full and indexed with `%`, not built from the index: Tailwind's JIT scans source text,
 * so `[animation-delay:${index * 120}ms]` is a class that is never generated. Same rule as `REVEAL_DELAY`.
 */
const PULSE_DELAY = [
  '[animation-delay:0ms]',
  '[animation-delay:120ms]',
  '[animation-delay:240ms]',
  '[animation-delay:360ms]',
  '[animation-delay:480ms]',
  '[animation-delay:600ms]',
];

/**
 * @param count How many placeholders — 6 for a full history page, 4 for the homepage strip.
 * @param className The grid classes, so each caller keeps its own column count and top margin.
 */
function GenerationSkeleton({ count, className }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        // One phase per card, shared by its three bars: the card breathes on its own beat, but its
        // insides stay coherent with each other rather than rippling within a single placeholder.
        const delay = PULSE_DELAY[index % PULSE_DELAY.length];

        return (
          <div
            key={index}
            className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-200"
          >
            {/* `motion-reduce:animate-none` on all three: an infinite animation is the one kind that
                cannot be allowed to ignore the preference. These had none before. */}
            <div className={`aspect-square animate-pulse bg-stone-200/70 motion-reduce:animate-none ${delay}`} />
            <div className="p-4 sm:p-5">
              <div className={`h-4 w-3/4 animate-pulse rounded bg-stone-200/80 motion-reduce:animate-none ${delay}`} />
              <div className={`mt-3 h-3 w-1/2 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none ${delay}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GenerationSkeleton;
