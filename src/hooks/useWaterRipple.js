import { useEffect, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference'; // Shared stand-down for reduced motion
import { canObserve } from './useRevealOnScroll'; // jsdom has no IntersectionObserver — fail open there too

/*
 * Simulation tuning. One table, because every number here is a feel decision someone will
 * want to nudge later.
 *
 * SIM_SCALE      one simulated cell per 3 CSS pixels — the footer is ~1500×400, so the wave
 *                equation runs on ~500×130 cells and the browser's smooth upscaling hides the
 *                difference while the per-frame cost drops ~9×.
 * DAMPING        energy kept per step. Lower dies before a ripple reaches the far column;
 *                higher never settles and the loop never gets to park itself.
 * STEP_INTERVAL  one wave step every Nth rAF frame — the wave equation's propagation speed is
 *                fixed per step, so skipping frames is how ripple speed is dialed (3 = one-third
 *                of display rate: a languid pond drift instead of a fast shimmer).
 */
const SIM_SCALE = 3;
const DAMPING = 0.981; // Eased from 0.976: slower ripples linger longer before fading, like real water.
/** Run a wave step only on every Nth rAF frame — 3 slows propagation to one-third speed. */
const STEP_INTERVAL = 3; // 3 = one-third of display-rate speed: a languid pond pace.
/** Calm frames before the loop parks itself — a rAF loop must not burn battery on still water. */
const SETTLE_FRAMES = 40;
/** Largest per-cell change below which the surface counts as still. */
const CALM_THRESHOLD = 0.05;
/** Cursor-trail drops: small and frequent, so the wake reads as a fingertip drawn through water. */
const TRAIL_RADIUS = 2;
const TRAIL_STRENGTH = 170; // Eased from 240: gentler drops to match the slower water — a wake, not a splash.
/** CSS pixels of travel between trail drops — raised to 24 so a sweep lays down distinct,
    well-separated rings instead of a crowded, jittery churn (fewer waves, calmer water). */
const TRAIL_MIN_DISTANCE = 24;
/** Click/tap splash: one fat drop, so a press visibly "plunks" the surface. */
const SPLASH_RADIUS = 5;
const SPLASH_STRENGTH = 650; // Eased from 850: slow water reads better with a softer "plunk".

/**
 * A living water surface behind the footer's content.
 *
 * A height-field simulation, not a CSS fake: two Float32 buffers hold the water's height per
 * cell, each pointer move pushes a drop into the field at the cursor, and every frame runs the
 * discrete wave equation (each cell tends toward the average of its four neighbours, losing a
 * little energy), which is what makes circular ripples *propagate and interfere* like real
 * water instead of playing a canned animation. Rendering turns the height field into light:
 * each cell's slope toward the light becomes a pearl-white glint on the crests, a soft teal
 * shadow in the troughs — normal-style shading is what makes the surface read as 3D.
 *
 * Contract with the caller: the returned ref goes on a `pointer-events-none` canvas that
 * absolutely fills the footer; pointer events are heard on the canvas's parent (the footer)
 * because the content above the canvas must stay clickable, and every move over those links
 * still bubbles up — the ripple follows the cursor wherever it is in the footer.
 *
 * Stands down completely — no loop, no listeners, a transparent sheet — for reduced motion,
 * in environments without IntersectionObserver (`canObserve()`, the jsdom guard
 * `useRevealOnScroll` exports for the same reason), and where `getContext('2d')` is null
 * (jsdom again; App.test.jsx renders this footer). The loop only runs while the footer is on
 * screen, and parks itself after `SETTLE_FRAMES` calm frames until the next drop or
 * re-entry wakes it.
 *
 * @returns A callback ref for the canvas element.
 */
export default function useWaterRipple() {
  // Callback ref in state, the pattern `useRevealOnScroll` documents: a node that exists only
  // after mount must re-run this effect, and a `useRef` object would not.
  const [canvas, setCanvas] = useState(null);

  useEffect(() => {
    if (!canvas || !canObserve() || prefersReducedMotion()) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined; // No 2D canvas (jsdom) — stay a transparent, still sheet.
    }

    const surface = canvas.parentElement || canvas;

    let width = 0;
    let height = 0;
    let current = new Float32Array(0); // Newest height field…
    let previous = new Float32Array(0); // …and the frame before it. Swapped, never mixed.
    let image = null; // Reused ImageData — one allocation per resize, not per frame.
    let frame = null; // rAF id; non-null only while the loop runs.
    let visible = true; // Footer on screen? (IntersectionObserver)
    let calmFrames = 0;
    let frameTick = 0; // rAF counter for the STEP_INTERVAL frame-skip throttle.
    let lastTrail = { x: -1e5, y: -1e5 };

    /** Size the field to the footer at simulation resolution and still the water. */
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(3, Math.floor(rect.width / SIM_SCALE));
      height = Math.max(3, Math.floor(rect.height / SIM_SCALE));
      canvas.width = width; // CSS (h-full w-full) upscales this with smoothing.
      canvas.height = height;
      current = new Float32Array(width * height);
      previous = new Float32Array(width * height);
      image = context.createImageData(width, height);
    }

    /** Push a circular drop into the field at a viewport position and make sure the loop runs. */
    function dropAt(clientX, clientY, radius, strength) {
      const rect = canvas.getBoundingClientRect();
      const cx = Math.round((clientX - rect.left) / SIM_SCALE);
      const cy = Math.round((clientY - rect.top) / SIM_SCALE);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue; // A disc, not a square.
          const x = cx + dx;
          const y = cy + dy;
          if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;
          previous[y * width + x] = strength;
        }
      }
      wake();
    }

    /** Restart the loop if it is parked. Guarded so drops before the first resize do nothing. */
    function wake() {
      if (frame === null && width > 3) {
        frame = requestAnimationFrame(step);
      }
    }

    function step() {
      frame = null;
      // Frame-skip throttle: only advance the simulation on every STEP_INTERVAL-th rAF frame.
      // Skipped frames just reschedule — the surface holds still for 1/120s, which the eye
      // never notices, while the waves now crawl at half speed.
      frameTick += 1;
      if (frameTick % STEP_INTERVAL !== 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      // Propagate one frame: each cell leans toward the average of its four neighbours minus
      // its own previous value — the discrete wave equation. Reading from `current` while
      // writing `previous` (then swapping) keeps the two frames apart; writing in place would
      // smear the wave with its own echo.
      let peak = 0;
      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const i = row + x;
          const value =
            (current[i - 1] + current[i + 1] + current[i - width] + current[i + width]) / 2 -
            previous[i];
          previous[i] = value * DAMPING;
          const magnitude = value < 0 ? -value : value;
          if (magnitude > peak) peak = magnitude;
        }
      }
      const swap = current;
      current = previous;
      previous = swap;

      render();

      // Park the loop once the water has been still long enough. `dropAt` and the visibility
      // observer are what wake it again.
      calmFrames = peak < CALM_THRESHOLD ? calmFrames + 1 : 0;
      if (visible && calmFrames < SETTLE_FRAMES) {
        frame = requestAnimationFrame(step);
      }
    }

    /** Shade the height field into light: pearl glints on crests, teal shadows in troughs,
        and fully transparent flats, so the light theme's own background does the talking. */
    function render() {
      const data = image.data;
      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const i = row + x;
          // Slope toward the top-left light. The eye reads this lighting — glint bright, shadow
          // cool — as three-dimensional water rather than as circles on a page.
          const slope =
            (current[i - 1] - current[i + 1] + current[i - width] - current[i + width]) * 0.75;
          const o = i * 4;
          if (slope > 0) {
            const t = slope < 6 ? slope / 6 : 1; // Clamped, so the brightest crest never clips RGB.
            data[o] = 255; // Pearl-white specular glint on the crest…
            data[o + 1] = 255;
            data[o + 2] = 252;
            data[o + 3] = 70 * t; // …kept translucent, so it shimmers over the light background.
          } else {
            const t = slope > -6 ? -slope / 6 : 1;
            data[o] = 90; // A soft translucent teal-grey shadow pools in the trough…
            data[o + 1] = 130;
            data[o + 2] = 135;
            data[o + 3] = 55 * t; // …and still water fades to fully transparent.
          }
        }
      }
      context.putImageData(image, 0, 0);
    }

    function onPointerMove(event) {
      const dx = event.clientX - lastTrail.x;
      const dy = event.clientY - lastTrail.y;
      if (dx * dx + dy * dy < TRAIL_MIN_DISTANCE * TRAIL_MIN_DISTANCE) return;
      lastTrail = { x: event.clientX, y: event.clientY };
      dropAt(event.clientX, event.clientY, TRAIL_RADIUS, TRAIL_STRENGTH);
    }

    function onPointerDown(event) {
      dropAt(event.clientX, event.clientY, SPLASH_RADIUS, SPLASH_STRENGTH);
    }

    function onResize() {
      resize();
    }

    resize();
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake(); // Back on screen — resume if it parked mid-ripple.
    });
    observer.observe(surface);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [canvas]);

  return setCanvas;
}
