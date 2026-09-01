import { useEffect, useRef, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference';

/**
 * Returns a `translateY` offset (in px) that tracks the scroll position, scaled by `speed`.
 *
 * Used on the ambient blobs so they drift at a different rate than the content as the
 * visitor scrolls — genuine depth rather than a fixed CSS loop pretending to breathe.
 * The CSS `drift-*` keyframes keep running on top; this hook adds the scroll-relative layer.
 *
 * @param speed  Pixels of offset per pixel of scroll. Positive = moves slower than content
 *               (drifts "behind"), negative = moves faster (drifts "ahead"). Typical range 0.05–0.2.
 * @returns  A ref to attach to the element, and the current `translateY` value as a number.
 */
export default function useParallax(speed = 0.1) {
  const [offset, setOffset] = useState(0);
  const [node, setNode] = useState(null);
  const rafRef = useRef(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || !node) {
      return undefined;
    }

    const onScroll = () => {
      lastScrollRef.current = window.scrollY;
    };

    const step = () => {
      // Interpolate toward the target for smoothness — raw scrollY causes jitter on
      // high-refresh displays because scroll events and paint frames rarely align.
      setOffset((prev) => {
        const target = lastScrollRef.current * speed;
        const next = prev + (target - prev) * 0.15; // Lerp factor: fast enough to feel connected, slow enough to smooth
        return Math.abs(next - target) < 0.01 ? target : next;
      });
      rafRef.current = requestAnimationFrame(step);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    lastScrollRef.current = window.scrollY;
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [node, speed]);

  // The ref callback: stable identity so React does not re-attach on every render.
  return [setNode, offset];
}
