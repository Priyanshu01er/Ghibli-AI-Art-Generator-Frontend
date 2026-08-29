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