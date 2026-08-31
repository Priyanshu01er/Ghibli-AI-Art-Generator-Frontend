import { useLayoutEffect, useState } from 'react';

/**
 * Tells you when an `<img>` has actually got its pixels, so the picture can dissolve in instead of
 * appearing between one frame and the next.
 *
 * Worth having because this page's photographs are heavy — `P1.png` alone is ~10MB — and until now
 * every one of them popped into existence the moment it decoded, in the middle of whatever scroll
 * reveal happened to be running.
 *
 * Deliberately just a boolean, in the same shape as `useRevealOnScroll`: the caller decides what
 * "loaded" looks like. It must apply that to a *wrapper*, never to the `<img>` itself — two
 * `transition-*` utilities on one element both set `transition-property`, so whichever Tailwind emits
 * last silently wins, and every one of these images already owns `transition-transform` for its
 * hover zoom.
 *
 * @returns `[ref, isLoaded]` — put the ref on the `<img>`. It is a callback ref, not a `useRef`
 *   object, because several callers render their `<img>` only once there is something to show.
 */
export default function useImageLoaded() {
  /*
   * A callback ref held in state, for the same reason `useRevealOnScroll` uses one: the `<img>` does
   * not always exist when this component mounts. The create page's result image is the case that
   * matters — it is rendered only once a generation has landed, so a `useRef` was still null on the
   * one run this effect got, `isLoaded` never flipped, and the finished artwork sat at `opacity-0`.
   * A state setter re-renders when the node arrives, so the effect follows the element.
   */
  const [image, setImage] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // A layout effect, not a plain one: the cached-image branch below has to resolve *before* the
  // browser paints, or a re-mounted picture (every inspiration swap is one) shows a single frame at
  // `opacity-0` on its way in — a flash, which is the one thing this hook exists to prevent. Still
  // true through the callback ref: React flushes a commit-phase state update before it paints.
  useLayoutEffect(() => {
    if (!image) {
      return undefined;
    }

    // A cached image is already `complete` before this effect runs — its `load` event fired before
    // React attached anything — so it must resolve here or it would stay invisible forever. This is
    // also what stops a re-mounted picture from fading in a second time.
    if (image.complete && image.naturalWidth > 0) {
      setIsLoaded(true);
      return undefined;
    }

    // A different `<img>` than the last one this hook watched, and its pixels are not here yet: reset,
    // or the second artwork after "Create Another" would appear at full opacity with no fade at all,
    // inheriting the first one's `true`. Safe in a layout effect — nothing has painted yet.
    setIsLoaded(false);

    const onSettled = () => setIsLoaded(true);

    image.addEventListener('load', onSettled);
    // `error` too: a file that fails to load must show its alt text, not leave an invisible hole.
    image.addEventListener('error', onSettled);

    return () => {
      image.removeEventListener('load', onSettled);
      image.removeEventListener('error', onSettled);
    };
  }, [image]);

  return [setImage, isLoaded];
}
