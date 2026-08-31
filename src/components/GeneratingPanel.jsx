/**
 * What the result panel shows while the model is working.
 *
 * This is the longest dead moment on the site: a generation takes **5 to 30 seconds**, and until now
 * the only thing that changed in that window was a button label going from `Transform to Ghibli Art`
 * to `Transforming...`. A wait that looks identical to a hung page is how "is it broken?" gets asked,
 * which is the same problem `ColdStartNotice` was written for on the auth pages.
 *
 * Three parts, in order of how much each one carries:
 *   1. The `shimmer` sweep, which is the only thing on screen that proves time is passing.
 *   2. The spinner ring — the same 20px box, `strokeWidth 1.8` and gapped arc as
 *      `ColdStartNotice.jsx:24-34`. Copied rather than extracted on purpose: that component is a
 *      whole amber card with its own copy and its own test, and lifting one `<svg>` out of it would
 *      churn a file that has nothing else to do with this change.
 *   3. `role="status"`, so the wait is announced instead of being a silent visual event. `status`
 *      and not `alert` for the same reason as `ColdStartNotice`: this is progress, not a failure.
 *
 * @param label What is being made — "Painting your Ghibli art…" reads better than a generic verb.
 */
export default function GeneratingPanel({ label }) {
  return (
    <div role="status" className="w-full">
      {/* The gradient is deliberately twice the box's width (`bg-[length:200%_100%]`), because
          `shimmer` animates `background-position` — a gradient sized to the box has nowhere to
          travel and the sweep would not move at all. */}
      <div className="h-36 w-full animate-shimmer rounded-xl bg-gradient-to-r from-stone-200/80 via-white to-stone-200/80 bg-[length:200%_100%] motion-reduce:animate-none sm:h-44" />

      <div className="mt-4 flex items-center justify-center gap-3">
        <svg
          aria-hidden="true"
          className="h-5 w-5 flex-shrink-0 animate-spin text-brand-700 motion-reduce:animate-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          {/* A ring with a gap rather than a full circle, so the rotation is visible. */}
          <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
        </svg>
        <p className="text-base font-semibold text-slate-600">{label}</p>
      </div>

      {/* Names the real number instead of asking for patience in the abstract, and says why staying
          is optional — `RecentGenerations` sits outside the tab swap and refetches on the generation
          event, so the artwork survives a switch even though this panel does not. */}
      <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-slate-400">
        Usually 5 to 30 seconds. It is saved to your history the moment it lands, so a tab switch
        cannot lose it.
      </p>
    </div>
  );
}
