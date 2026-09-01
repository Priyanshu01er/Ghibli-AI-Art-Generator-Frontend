export const navItems = [
  { label: 'Home', href: '/home' },
  { label: 'Create', href: '/create' },
  { label: 'Features', href: '/features' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'FAQ', href: '/faq' },
];

export const featureCards = [
  {
    title: 'High Accuracy Ghibli Art Generation',
    description:
      'Upload a photo and retain the original character and emotion while adding a magical storybook atmosphere.',
  },
  {
    title: 'Fast Image Processing',
    description:
      'Generate cinematic, warm-toned artwork in seconds with an optimized transformation pipeline built for creators.',
  },
  {
    title: 'Stunning Studio Quality',
    description:
      'Get high-resolution results with painterly details, soft lighting, and expressive composition for social sharing.',
  },
];

export const faqItems = [
  {
    question: 'What is the Studio Ghibli AI Generator?',
    answer:
      'The Ghibli AI Generator is an advanced platform powered by AI that creates original artwork in the distinctive style of Studio Ghibli films. Our technology transforms photos or text descriptions into beautiful Ghibli art images with authentic aesthetic elements.',
  },
  {
    question: 'What are the key features of the Ghibli AI?',
    answer:
      'Key features include photo-to-Ghibli art transformation, text-to-Ghibli image generation, Ghibli character creation, scene extension, Ghibli background generation, and animation preparation - all in authentic Studio Ghibli style using our specialized Ghibli generator.',
  },
  {
    question: 'Can I select specific Ghibli film styles for my Ghibli art?',
    answer:
      "Absolutely! You can choose influences from various Studio Ghibli films like 'Spirited Away,' 'Princess Mononoke,' or 'My Neighbor Totoro' and customize the style, mood, and visual elements to reflect your creative vision in the generated Ghibli images.",
  },
  {
    question: 'Is the Studio Ghibli AI Generator available on mobile?',
    answer:
      'Yes, our Ghibli AI platform is accessible on both desktop and mobile devices via web browsers, allowing you to create Ghibli-style artwork and Ghibli images wherever you are.',
  },
];

/**
 * Copy for `InspirationSection`. Kept here, beside `featureCards` and `faqItems`, because every
 * other home section already reads its content from this module — a section that inlined its own
 * text would be the one place to look twice when the wording changes.
 *
 * `image` is the imported asset URL, resolved in the component: an `import` in this data file
 * would make it a module with side effects that Vite has to bundle even for pages that never
 * render the section. `caption` is the small line on a tile; `quote`/`attribution` are the
 * overlay on the featured panel and the tiles alike.
 */
export const ghibliQuotes = [
  {
    id: 'wind',
    asset: 'H3',
    quote: 'The wind is rising. We must try to live.',
    attribution: 'The Wind Rises',
    caption: 'Valleys that hum before the storm',
    alt: 'A wide Ghibli-style valley under a bright, wind-swept sky',
  },
  {
    id: 'forest',
    asset: 'H1',
    quote: 'Trees and people used to be good friends.',
    attribution: 'My Neighbor Totoro',
    caption: 'Old woods, older friendships',
    alt: 'A sunlit Ghibli-style forest path lined with tall trees',
  },
  {
    id: 'flight',
    asset: 'H2',
    quote: 'A heart can fly the moment it decides where to go.',
    attribution: 'Kiki’s Delivery Service',
    caption: 'Somewhere above the afternoon',
    alt: 'Rolling Ghibli-style hills seen from high above with drifting clouds',
  },
  {
    id: 'water',
    asset: 'H4',
    quote: 'Once you meet someone, you never really forget them.',
    attribution: 'Spirited Away',
    caption: 'Still water keeps every reflection',
    alt: 'A calm Ghibli-style lake reflecting the sky at golden hour',
  },
];
 
/**
 * Copy for 'WonderSection' — the postcard mosaic between the FAQ and the closing CTA. Same
 * convention as 'ghibliQuotes': plain data here, asset keys resolved to URLs by the component.
 *
 * 'title' is the overlay's first line and 'caption' the smaller second line. The six assets
 * (Z1–Z6) arrive at very different aspect ratios; the mosaic in the component exists to absorb
 * that, so the data stays just words. Listed in render order.
 *
 * One exception to "just words": the optional `imageFocus` carries an object-position class
 * (`object-bottom` on Z2) for tiles where object-cover's default centre crop would cut away
 * the subject — Z2's island house sits at the very bottom of a very tall sky, so centring the
 * crop leaves nothing but blue. The literal class string lives here rather than a lookup in
 * the component because Tailwind's JIT scans this file too and generates it either way.
 */
export const wonderScenes = [
  {
    id: 'lakehouse',
    asset: 'Z1',
    title: 'Where the day ends quietly',
    caption: 'A lakeside house, its windows lit against the dusk',
    alt: 'A Ghibli-style lakeside house glowing at dusk, its lights reflected in still water',
  },
  {
    id: 'island',
    asset: 'Z2',
    title: 'A small life under a big sky',
    caption: 'One house, one tree, and all that blue',
    alt: 'A tiny Ghibli-style island house with a single tree beneath an enormous afternoon sky',
    // Anchor the crop to the image's bottom: the island house sits at the very foot of this
    // tall portrait, so the default centre crop showed only empty sky and pushed the house
    // out of frame — cropping from the top instead keeps the subject in the tile.
    imageFocus: 'object-bottom',
  },
  // Z4 and Z6 are back in their original spots: an earlier swap moved Z6 into row 2 and Z4
  // into row 3, but both belong where they started — Z4 ("The path remembers you") on the
  // wide tile of row 2, Z6 ("Somewhere for lunch") in row 3's second column. Titles,
  // captions and alts stay with their own assets either way.
  {
    id: 'cottage',
    asset: 'Z4',
    title: 'The path remembers you',
    caption: 'Wildflowers lining the way back to the cottage',
    alt: 'A footpath through Ghibli-style wildflowers leading to a small cottage under a blue sky',
  },
  {
    id: 'fields',
    asset: 'Z3',
    title: 'The valley, on foot',
    caption: 'A hilltop pause above the quilted fields',
    alt: 'A traveller on a Ghibli-style hilltop overlooking a patchwork of farm fields at golden hour',
  },
  {
    id: 'meadow',
    asset: 'Z6',
    title: 'Somewhere for lunch',
    caption: 'A red roof at the end of the meadow',
    alt: 'A red-roofed Ghibli-style cottage at the end of a path through a flower meadow under towering clouds',
  },
  {
    id: 'moss',
    asset: 'Z5',
    title: 'The world after rain',
    caption: 'Pink moss to the horizon, and one lit window',
    alt: 'A surreal Ghibli-style field of pink moss with blue mountains and a lone house under dramatic clouds',
  },
];
