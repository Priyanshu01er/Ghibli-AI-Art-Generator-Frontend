/**
 * The "still waking up" card shown under a submitting auth form.
 *
 * The API runs on Render's free tier, which spins the instance down after 15 minutes of no
 * traffic and takes about a minute to bring it back. Before this, both auth pages only flipped a
 * button label — so the honest 60-second wait looked exactly like a broken site, which is how it
 * was reported.
 *
 * Amber and the same card shape as `GenerationErrorNotice`'s soft tone, which is in turn the same
 * amber as the session-expired banner on `LoginPage`. Third member of an existing family, not a
 * new visual language.
 *
 * `role="status"` and not `role="alert"`: this is progress, not a failure. `alert` interrupts a
 * screen reader mid-sentence, which is wrong for "please keep waiting".
 */
export default function ColdStartNotice() {
  return (
    <div
      role="status"
      className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-inset ring-white/40"
    >
      <div className="flex items-start gap-3">
        {/* Same 20px box and strokeWidth 1.8 as every other inline icon in the app. */}
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-amber-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          {/* A ring with a gap rather than a full circle, so the rotation is visible. */}
          <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Waking the server up</p>
          <p className="mt-0.5 text-sm font-medium">
            Ghibli AI runs on a free server that sleeps when nobody is using it. The first request
            after a quiet spell takes up to a minute.
          </p>
          {/* Says explicitly what not to do: a second submit restarts the wait from zero. */}
          <p className="mt-1 text-sm opacity-80">
            Nothing is wrong — please stay on this page rather than pressing the button again.
          </p>
        </div>
      </div>
    </div>
  );
}
