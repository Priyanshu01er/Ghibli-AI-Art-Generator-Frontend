import useTypewriter from '../hooks/useTypewriter'; // Timing only; the markup below decides what it looks like

/**
 * The hero <h1>, typed in one character at a time.
 *
 * Every character is its own span, sitting in its final position from the very first frame and
 * merely `invisible` until its turn comes. That is deliberate, and it is what keeps two promises:
 *
 *  - **No colour moves.** Line 2 is one `background-clip: text` gradient on a `block` span, so each
 *    letter's colour comes from where it sits inside the full line box. Typing by growing the text
 *    would slide every letter leftwards as the line re-centres, dragging it through the ramp. Here
 *    nothing ever moves, so each letter appears at exactly the colour the finished headline has.
 *  - **Nothing below shifts.** The h1 occupies its final height and wraps its final way from the
 *    first paint, so the paragraph, the CTA and the pills never move (no layout shift).
 *
 * The spans stay `display: inline` and the spaces stay real spaces, because inline boxes add no
 * line-break opportunities — the wrap at 375px is character-for-character what it was before.
 *
 * Its own component (rather than staying inline in HeroSection) so a keystroke re-renders 51 spans
 * and not the paragraph, the button and the three pills as well.
 */

// The headline, and the only place it is written down. Line 2 carries the exact classes it had when
// this markup lived in HeroSection — including `block`, which is what makes the gradient box the
// full width of the h1 instead of the width of the text.
const HEADLINE_LINES = [
  {
    text: 'Transform Your Photos into',
    className: null, // Inherits the h1's text-slate-900
    caretRgb: '15 23 42', // slate-900, so the caret is the same ink as the line
  },
  {
    text: 'Ghibli Art with Ghibli AI',
    className: 'block bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500 bg-clip-text text-transparent',
    caretRgb: '15 118 110', // brand-500: this line's own text is transparent, so the caret needs a colour of its own
  },
];

// '\n' is never drawn. It costs the typist one tick, and that tick is the pause between the lines.
const TYPED_TEXT = HEADLINE_LINES.map((line) => line.text).join('\n');

// The accessible name: the same sentence with the line break read as the space it stands for. The
// old markup dropped that space, so screen readers heard "...intoGhibli Art...".
export const HEADLINE_TEXT = HEADLINE_LINES.map((line) => line.text).join(' ');

function HeroHeadline() {
  const { revealed, isFinished, caretRef } = useTypewriter(TYPED_TEXT);

  // The caret rides the character just typed, or waits at the left edge of the first one. Stepping
  // back over the undrawn '\n' parks it on the last letter of line 1 during the line pause.
  const lastTyped = Math.max(revealed - 1, 0);
  const caretIndex = TYPED_TEXT[lastTyped] === '\n' ? lastTyped - 1 : lastTyped;
  const caretAtStart = revealed === 0;
  const showCaret = !isFinished; // Gone for good once it has finished, so the resting frame is today's headline

  let offset = 0; // Running index into TYPED_TEXT so each line can slice its own characters out of it

  return (
    <h1
      // The whole sentence, announced once: assistive tech gets the heading immediately and never
      // hears a half-typed fragment or 51 separate letters.
      aria-label={HEADLINE_TEXT}
      // text-5xl (48px) as the base put "Transform Your Photos into" on three lines at 375px.
      // One step down at the bottom, one extra step added at xl so the laptop size is unchanged.
      className="mx-auto max-w-5xl font-heading text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl"
    >
      {/* The animated copy is decoration over the aria-label above, so it is hidden from the
          accessibility tree. `block` keeps the two lines flowing exactly as they did before. */}
      <span aria-hidden="true" className="block">
        {HEADLINE_LINES.map((line) => {
          const lineStart = offset;
          offset += line.text.length + 1; // +1 for the '\n' tick that separates the lines

          return (
            <span className={line.className ?? undefined} key={line.text}>
              {[...line.text].map((char, charIndex) => {
                const index = lineStart + charIndex;
                const hasCaret = index === caretIndex;
                const className = [
                  index < revealed ? null : 'invisible', // Holds its exact final box while it waits its turn
                  hasCaret ? 'relative' : null, // Anchor for the caret, which must cost no width
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  // eslint-disable-next-line react/no-array-index-key -- fixed string, fixed order
                  <span className={className || undefined} key={index}>
                    {char}
                    {hasCaret && showCaret ? (
                      <span
                        aria-hidden="true"
                        ref={caretRef}
                        // Absolute, so it adds no width and can never nudge the line. em units so it
                        // scales with the headline from text-4xl to text-7xl. `visible` because
                        // before the first keystroke it lives inside a hidden character, and a child
                        // can override the visibility it inherits.
                        className={`visible absolute bottom-[0.16em] h-[0.78em] w-[0.055em] rounded-full ${
                          caretAtStart ? 'left-[-0.09em]' : 'right-[-0.09em]'
                        }`}
                        // The colour is inline rather than a bg-* class because the blink fades the
                        // alpha channel: the loop writes only `--caret-alpha` (default 1, so the
                        // caret is solid before the first frame), and never `opacity`, which on a
                        // child of line 2's background-clip:text span would break the gradient.
                        style={{ '--caret-rgb': line.caretRgb, backgroundColor: 'rgb(var(--caret-rgb) / var(--caret-alpha, 1))' }}
                      />
                    ) : null}
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </h1>
  );
}

export default HeroHeadline;
