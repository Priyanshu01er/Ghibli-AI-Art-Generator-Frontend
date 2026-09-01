import { useCallback, useEffect, useRef, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference';

/**
 * Adds a subtle 3D perspective tilt to an element on hover, following the cursor.
 *
 * The element tilts toward the pointer — up to ±4° on the X axis and ±6° on the Y axis —
 * and smoothly returns to flat when the pointer leaves. Movement is interpolated via rAF
 * so it never jumps between frames.
 *
 * @param maxAngleX  Maximum tilt on the X axis (degrees). Default 4.
 * @param maxAngleY  Maximum tilt on the Y axis (degrees). Default 6.
 * @returns  A ref callback to attach to the container element.
 */
export default function useTilt(maxAngleX = 4, maxAngleY = 6) {
  const [node, setNode] = useState(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const isHovering = useRef(false);

  const lerp = (a, b, t) => a + (b - a) * t;

  useEffect(() => {
    if (prefersReducedMotion() || !node) {
      return undefined;
    }

    const onMouseMove = (event) => {
      if (!isHovering.current) return;
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Normalise to [-1, 1] range
      const normX = (event.clientX - centerX) / (rect.width / 2);
      const normY = (event.clientY - centerY) / (rect.height / 2);
      targetRef.current = {
        x: Math.max(-1, Math.min(1, normY)) * maxAngleX, // Y mouse → X tilt
        y: Math.max(-1, Math.min(1, normX)) * -maxAngleY, // X mouse → Y tilt (inverted)
      };
    };

    const onMouseEnter = () => {
      isHovering.current = true;
    };

    const onMouseLeave = () => {
      isHovering.current = false;
      targetRef.current = { x: 0, y: 0 }; // Spring back to flat
    };

    const step = () => {
      const { x: cx, y: cy } = currentRef.current;
      const { x: tx, y: ty } = targetRef.current;
      const nextX = lerp(cx, tx, 0.12);
      const nextY = lerp(cy, ty, 0.12);
      currentRef.current = { x: nextX, y: nextY };

      if (node) {
        const nearFlat = Math.abs(nextX) < 0.01 && Math.abs(nextY) < 0.01 && !isHovering.current;
        node.style.transform = nearFlat
          ? ''
          : `perspective(800px) rotateX(${nextX}deg) rotateY(${nextY}deg)`;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    node.addEventListener('mousemove', onMouseMove);
    node.addEventListener('mouseenter', onMouseEnter);
    node.addEventListener('mouseleave', onMouseLeave);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      node.removeEventListener('mousemove', onMouseMove);
      node.removeEventListener('mouseenter', onMouseEnter);
      node.removeEventListener('mouseleave', onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [node, maxAngleX, maxAngleY]);

  // Expose a stable callback ref; also apply `transform-style: preserve-3d` for child perspective.
  const ref = useCallback(
    (el) => {
      setNode(el);
      if (el) {
        el.style.transformStyle = 'preserve-3d';
      }
    },
    [],
  );

  return ref;
}
