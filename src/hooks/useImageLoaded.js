import { useEffect, useRef, useState } from 'react';

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
 * @returns `[ref, isLoaded]` — put the ref on the `<img>`.
 */
export default function useImageLoaded() {
  const ref = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const image = ref.current;

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

    const onSettled = () => setIsLoaded(true);

    image.addEventListener('load', onSettled);
    // `error` too: a file that fails to load must show its alt text, not leave an invisible hole.
    image.addEventListener('error', onSettled);

    return () => {
      image.removeEventListener('load', onSettled);
      image.removeEventListener('error', onSettled);
    };
  }, []);

  return [ref, isLoaded];
}
