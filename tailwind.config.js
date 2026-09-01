/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'], // ./public/index.html does not exist — Vite serves ./index.html from the project root
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0f766e',
          600: '#0b5f59',
          700: '#084d49',
          800: '#06403d', // Was missing, so `text-brand-800` in CreatePage silently did nothing
          900: '#032a29',
        },
        accent: {
          100: '#fff7e6',
          300: '#ffe0a8',
          500: '#ffbe55',
        },
      },
      boxShadow: {
        card: '0 12px 30px rgba(15, 23, 42, 0.08)',
        glow: '0 18px 40px rgba(15, 118, 110, 0.25)',
      },
      // The site's motion vocabulary — started on the homepage, now shared by the legal, create and
      // history pages too. Tokens rather than one-off CSS so every section reaches for the same
      // movements, and every use pairs with `motion-reduce:animate-none`.
      // Three named curves, so "how something arrives" is one decision instead of nine `ease-out`s.
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)', // Expo-out: a long tail, so an arrival settles rather than stops
        settle: 'cubic-bezier(0.34, 1.2, 0.64, 1)', // Hover *in*: a touch of overshoot, which is what a real object does
        exit: 'cubic-bezier(0.4, 0, 0.6, 1)', // Hover *out*, and the way back from anything
        springIn: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Stronger overshoot than settle — cards feel like they bounce on hover
      },
      // Only for the header dropdown, which needs `visibility` transitioned alongside the fade so the
      // panel can leave the tab order at the end of its own exit rather than the start.
      transitionProperty: {
        menu: 'opacity, transform, visibility',
      },
      keyframes: {
        // A slow pan across the one big static photograph. 6% is small enough that nobody catches it
        // moving and large enough that the picture never feels like a screenshot.
        'ken-burns': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.06) translate3d(-1.5%, -1%, 0)' },
        },
        // Every picture's arrival, and the inspiration swap: a photograph developing rather than a
        // cut. Opacity and blur only — a transform here would fight (and, with `both`, permanently
        // outrank) the hover zoom that each of these images already owns.
        'develop-in': {
          from: { opacity: '0', filter: 'blur(10px)' },
          to: { opacity: '1', filter: 'blur(0)' },
        },
        // Every scroll reveal on the page. An animation rather than a transition on purpose: the
        // stagger then rides `animation-delay`, which leaves each element's `transition-*` free to
        // describe nothing but its hover. Paired with `backwards` fill below, never `forwards`.
        'rise-in': {
          from: { opacity: '0', transform: 'translate3d(0, 16px, 0)' },
          to: { opacity: '1', transform: 'none' },
        },
        // The three blob paths. Scale as well as translate, and three waypoints rather than two, so a
        // blob wanders instead of sliding up a straight line and back. Composited transform only:
        // the blur is baked into the layer texture, so scaling it costs no repaint.
        'drift-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -4%, 0) scale(1.06)' },
        },
        'drift-alt': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.05)' },
          '33%': { transform: 'translate3d(-4%, 2%, 0) scale(1)' },
          '66%': { transform: 'translate3d(2%, 4%, 0) scale(1.08)' },
        },
        'drift-wide': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.02)' },
          '50%': { transform: 'translate3d(-5%, -3%, 0) scale(1.1)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } }, // The lightbox backdrop leaving
        'panel-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Shorter and shallower than the entrance: a dialog should leave faster than it arrived.
        'panel-out': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'scale(0.98) translateY(6px)' },
        },
        // A small thing landing *into* a container that has already arrived — the numbered badges on
        // the legal clauses. Starts at 0.6 rather than 0.9 because an 8px-radius circle needs a large
        // relative change to read as a pop at all.
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.6)' },
          to: { opacity: '1', transform: 'none' },
        },
        // The only sweep on the site: a highlight crossing the create page's result panel while the
        // model works. 100% → 0% and not the reverse, because the gradient is twice the panel's width,
        // so a *decreasing* background-position is what moves the highlight left to right.
        shimmer: {
          from: { backgroundPosition: '100% 0' },
          to: { backgroundPosition: '0% 0' },
        },
        // 3D card entrance: perspective tilt + scale for legal page hero and clause cards.
        // A gentle X-axis rotation creates depth; 'backwards' holds the tilted frame during
        // the stagger delay so cards arrive one by one without a blank flash.
        'card-flip-in': {
          from: { opacity: '0', transform: 'perspective(800px) rotateX(12deg) translateY(24px) scale(0.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Lateral depth entrance: slight Y-axis rotation + translateX for storage columns.
        // Creates a feeling of objects sliding in from the side with dimensional depth.
        'float-in': {
          from: { opacity: '0', transform: 'perspective(800px) rotateY(-6deg) translateX(-12px) translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Gallery tile entrance: dramatic 3D cascade with scale + perspective tilt.
        // Tiles appear to flip into view from a slight angle, creating a card-deal effect.
        'gallery-enter': {
          from: { opacity: '0', transform: 'perspective(600px) rotateX(8deg) scale(0.92)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'ken-burns': 'ken-burns 32s ease-in-out infinite alternate', // 24s → 32s: less movement per frame
        // 0.7s and `ease-entrance`, so a picture landing reads as the same kind of event as a section
        // revealing. `both` is load-bearing: its backwards half holds the 0% frame on the frame the
        // class flips, which is what makes the arrival flash-free instead of a one-frame pop.
        'develop-in': 'develop-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        // `backwards`, emphatically not `forwards`/`both`: it holds the 0% frame through the stagger
        // delay and then hands the element back to its own styles, so a revealed card's `hover:`
        // transform still works. A filled transform animation would outrank it forever.
        'rise-in': 'rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        // The same fade, for anything whose transform belongs to a `hover:` (the hero CTA) or to a
        // second animation. Reuses the `fade-in` keyframes rather than declaring an identical pair.
        'soft-in': 'fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        // Three periods that do not divide into each other, so the five blobs never re-sync into one
        // page-wide heartbeat the way a single shared 18s loop did.
        'drift-slow': 'drift-slow 19s ease-in-out infinite',
        'drift-alt': 'drift-alt 23s ease-in-out infinite',
        'drift-wide': 'drift-wide 29s ease-in-out infinite',
        'fade-in': 'fade-in 0.18s ease-out both',
        'fade-out': 'fade-out 0.16s ease-in forwards', // `forwards`: holds transparent until React unmounts it
        'panel-in': 'panel-in 0.26s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'panel-out': 'panel-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards',
        // `ease-settle`'s curve, written out because the `animation` shorthand cannot name a
        // `transitionTimingFunction` token — the overshoot is the whole point of a pop.
        // `backwards` for the same reason as `rise-in`: this animates `transform`, and a filled
        // transform would outrank anything the element did later.
        'pop-in': 'pop-in 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) backwards',
        // The one token that loops without an end besides the blobs, so every use of it is both
        // conditional on the work actually being in progress and paired with `motion-reduce`.
        shimmer: 'shimmer 1.8s linear infinite',
        // 3D card flip: used on legal page hero and clause cards for dimensional entrance.
        // 0.8s slightly longer than rise-in to let the perspective rotation read fully.
        'card-flip-in': 'card-flip-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        // Float in: used on legal page storage columns for lateral depth entrance.
        'float-in': 'float-in 0.75s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        // Gallery cascade: used on gallery tiles for dramatic 3D deal effect.
        'gallery-enter': 'gallery-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards',
      },
    },
  },
  plugins: [],
}

