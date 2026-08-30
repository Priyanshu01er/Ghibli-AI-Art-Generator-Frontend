import { useEffect, useRef, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference'; // Shared with useRevealOnScroll

/**
 * Drives the hero headline's "someone is typing this" reveal.
 *
 * The hook owns nothing but timing: it hands back how many characters of `text` have been typed so
 * far, and the caller decides what that means visually. HeroHeadline keeps every character in the
 * DOM from the first frame and only flips each one's `visibility`, because the headline's second
 * line is painted by a single `background-clip: text` gradient — a letter that moves while it types
 * would be sampled from a different part of the colour ramp on every frame, and the brief was to
 * leave the colours alone. Measured, in case this is ever revisited: an `opacity`, `transform` or
 * `filter` on one of those character spans does not fade or move the letter, it drops the glyph out
 * of the parent's clip altogether. A character can only be on or off — which is what a keypress
 * does anyway, so all of the realism here has to come from the timing.
 *
 * Two things it does differently from the obvious implementation:
 *
 *  1. **One schedule, sampled per frame.** Every character's moment is drawn up front and a
 *     `requestAnimationFrame` loop reveals whatever is due. A chain of `setTimeout`s fires wherever
 *     it happens to land relative to the refresh rate, so with delays near the length of a frame
 *     some frames drew two characters and some drew none — that quantisation, rather than the
 *     jitter, is what read as machine-gun typing. Frame-aligned reveals plus an interval floor above
 *     one frame make it impossible. rAF also pauses in a background tab, so a visitor who comes back
 *     to it watches the headline type rather than finding it already finished.
 *  2. **A human distribution.** Intervals are right-skewed rather than symmetric, capitals cost the
 *     reach for shift, spaces and the line break get their own beat, the first few keys are slower
 *     than the rest, and every so often the typist hesitates.
 *
 * @param text the string being typed. A '\n' is a timing character only — the caller does not
 *   render it, so its tick becomes the pause between the two lines.
 * @returns `revealed` (characters typed so far), `isFinished` (the caret has left for good) and
 *   `caretRef` — attach that to the caret element and the loop blinks it in place.
 */

/** A beat after paint before the first keystroke, so the page settles and the caret is seen waiting. */
export const TYPE_START_DELAY_MS = 300;

/**
 * The body of the rhythm: `TYPE_MIN_MS + random()² × TYPE_SPAN_MS`, i.e. ≈26–68ms with a median
 * around 37ms. Squaring the draw is the whole trick — it clusters keystrokes near the floor and lets
 * a few drag behind, which is the shape real inter-key intervals have. The floor is deliberately
 * above one frame at 60Hz, so no two characters can ever appear in the same frame.
 */
export const TYPE_MIN_MS = 26;
export const TYPE_SPAN_MS = 42;

/** The reach for shift, added on a capital. */
export const TYPE_SHIFT_MS = 18;

/** The gap between words, added on a space. */
export const TYPE_WORD_PAUSE_MS = 60;

/** The breath between line 1 and line 2. Spent on the '\n', which is never drawn. */
export const TYPE_LINE_PAUSE_MS = 260;

/** The hands are still arriving: the first few keys take a little longer. */
export const TYPE_WARMUP_KEYS = 4;
export const TYPE_WARMUP_FACTOR = 1.35;

/** ~3 hesitations of 80–160ms in a 51-character sentence. The single biggest cure for a metronome. */
export const TYPE_HESITATION_CHANCE = 0.07;
export const TYPE_HESITATION_MS = 80;

/** How long the caret blinks on after the last character before it goes away for good. */
export const CARET_LINGER_MS = 1300;

/** One full fade-out-and-in — the period a 530ms hard blink used to have. */
export const CARET_BLINK_MS = 1060;

/** The wait *before* `char` is typed, where `index` is its position in the sentence. */
function pauseBefore(char, index) {
  if (char === undefined) {
    return 0; // Past the last character: nothing more is coming
  }
  if (char === '\n') {
    return TYPE_LINE_PAUSE_MS;
  }

  let pause = TYPE_MIN_MS + Math.random() ** 2 * TYPE_SPAN_MS;

  if (char === ' ') {
    pause += TYPE_WORD_PAUSE_MS;
  } else if (char !== char.toLowerCase()) {
    pause += TYPE_SHIFT_MS; // Capitals only: digits and punctuation equal their own lower case
  }
  if (index < TYPE_WARMUP_KEYS) {
    pause *= TYPE_WARMUP_FACTOR;
  }
  if (Math.random() < TYPE_HESITATION_CHANCE) {
    pause += TYPE_HESITATION_MS * (1 + Math.random());
  }

  return pause;
}

/**
 * When each character of `text` is due, in ms from the start of the animation. Drawn once per mount
 * rather than decided 51 times as the animation runs, so the timeline is a fixed thing the loop
 * merely reads — and every fresh page load still gets its own draw.
 */
export function buildSchedule(text) {
  const schedule = new Array(text.length);
  let at = TYPE_START_DELAY_MS; // The first character lands here

  for (let index = 0; index < text.length; index += 1) {
    schedule[index] = at;
    at += pauseBefore(text[index + 1], index + 1); // Then wait for the next key
  }

  return schedule;
}

/**
 * The caret's alpha `idleFor` ms into an idle window: hold on, fade out, hold off, fade in. A square
 * wave with 10% ramps rather than a hard flick — the ramps are what make it read as smooth, and the
 * flat stretches are what keep it reading as a text cursor rather than a pulsing dot.
 *
 * Each ramp runs through a smoothstep rather than straight down its line. A linear ramp between two
 * held values starts and stops with a corner — the eye catches both — and this is the one piece of
 * hero motion that is genuinely mid-flight while the visitor is reading. Four characters of
 * arithmetic remove both corners.
 */
/** 3t² − 2t³: zero slope at both ends, so a ramp eases out of the hold and into the next one. */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function caretAlpha(idleFor) {
  const phase = (idleFor % CARET_BLINK_MS) / CARET_BLINK_MS;

  if (phase < 0.4) return 1;
  if (phase < 0.5) return 1 - smoothstep((phase - 0.4) * 10); // ~106ms fade out
  if (phase < 0.9) return 0;
  return smoothstep((phase - 0.9) * 10); // ~106ms fade back in
}

export default function useTypewriter(text) {
  // Lazy initialiser, so the media query is read once per mount rather than on every render.
  const [reduceMotion] = useState(prefersReducedMotion);
  // Reduced motion starts at the end: the finished headline on the first render, no frame ever asked for.
  const [revealed, setRevealed] = useState(reduceMotion ? text.length : 0);
  const [isFinished, setIsFinished] = useState(reduceMotion);
  const caretRef = useRef(null);

  useEffect(() => {
    if (reduceMotion) {
      return undefined; // Nothing to animate; the text is already whole.
    }

    const schedule = buildSchedule(text);
    const lastAt = schedule[schedule.length - 1]; // When the sentence finishes, and the caret's linger begins
    let start = null;
    let shown = 0;
    let frame = requestAnimationFrame(step);

    function step(now) {
      // rAF's own timestamp, so there is no second clock to disagree with the frame we are painting.
      if (start === null) {
        start = now;
      }
      const elapsed = now - start;

      // Reveal everything now due. `while`, not `+= 1`, so a dropped frame catches up rather than
      // falling permanently behind; the interval floor means that is the only way it ever adds two.
      let due = shown;
      while (due < schedule.length && schedule[due] <= elapsed) {
        due += 1;
      }
      if (due !== shown) {
        shown = due;
        setRevealed(shown);
      }

      // The blink, written straight to the node instead of through state: 60 renders a second would
      // re-render all 51 character spans per frame, which is the opposite of smooth. Only the alpha
      // channel is touched (`--caret-alpha`), never `opacity` — an opacity below 1 on a child of a
      // background-clip:text element makes Chrome drop it from the clip, and the caret spends the
      // last second of the animation inside exactly such an element.
      if (caretRef.current) {
        const idleFor = elapsed < TYPE_START_DELAY_MS ? elapsed : elapsed - lastAt;
        // Negative means keys are still landing: a real cursor is solid while it moves.
        const alpha = idleFor < 0 ? 1 : caretAlpha(idleFor);
        caretRef.current.style.setProperty('--caret-alpha', String(alpha));
      }

      if (elapsed >= lastAt + CARET_LINGER_MS) {
        setIsFinished(true); // The caret leaves, and the resting frame is the original headline
        return; // and no further frame is requested
      }

      frame = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(frame); // Unmounting mid-sentence must not leave a loop behind
  }, [text, reduceMotion]);

  return { revealed, isFinished, caretRef };
}

