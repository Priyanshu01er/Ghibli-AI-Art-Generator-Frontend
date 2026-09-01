import { useCallback, useEffect, useRef, useState } from 'react';
import prefersReducedMotion from '../utils/motionPreference';

/**
 * Magnetic cursor effect: the element subtly shifts toward the pointer when hovered.
 *
 * The button is "pulled" toward the cursor by a few pixels (controlled by `strength`),
 * creating the magnetic-button feel. On mouse leave it springs back via rAF interpolation.
 *
 * @param strengthX  Max horizontal shift in px. Default 6.
 * @param strengthY  Max vertical shift in px. Default 3.
 * @returns  A ref callback to attach to the button/link element.
 */
export default function useMagnet(strengthX = 6, strengthY = 3) {
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
      const dx = (event.clientX - centerX) / (rect.width / 2);
      const dy = (event.clientY - centerY) / (rect.height / 2);
      targetRef.current = {
        x: Math.max(-1, Math.min(1, dx)) * strengthX,
        y: Math.max(-1, Math.min(1, dy)) * strengthY,
      };
    };

    const onMouseEnter = () => {
      isHovering.current = true;
    };

    const onMouseLeave = () => {
      isHovering.current = false;
      targetRef.current = { x: 0, y: 0 };
    };

    const step = () => {
      const { x: cx, y: cy } = currentRef.current;
      const { x: tx, y: ty } = targetRef.current;
      const nextX = lerp(cx, tx, 0.15);
      const nextY = lerp(cy, ty, 0.15);
      currentRef.current = { x: nextX, y: nextY };

      if (node) {
        const nearRest = Math.abs(nextX) < 0.01 && Math.abs(nextY) < 0.01;
        // Combine with existing transform via CSS custom properties to avoid overwriting
        // whatever the element already does (e.g. hover:-translate-y-0.5).
        node.style.setProperty('--magnet-x', nearRest ? '0px' : `${nextX.toFixed(2)}px`);
        node.style.setProperty('--magnet-y', nearRest ? '0px' : `${nextY.toFixed(2)}px`);
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
  }, [node, strengthX, strengthY]);

  const ref = useCallback((el) => {
    setNode(el);
  }, []);

  return ref;
}
