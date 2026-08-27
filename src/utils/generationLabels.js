/**
 * Display helpers for a history row. Kept out of the card component so the card is about
 * the object-URL lifecycle and nothing else.
 */

/**
 * The exact `<option>` labels from the Text-to-Art dropdown, keyed by the value that gets
 * stored. History must echo the words the user picked — a card reading "cinematic" for
 * something chosen as "Spirited Away" looks like a different setting.
 *
 * Kept as a literal copy of the options in `TextToArtSection` rather than imported from
 * it: that component owns a form, not a public style vocabulary, and exporting from it
 * would make a UI file the source of truth for stored data.
 */
const TEXT_STYLE_LABELS = {
  general: 'General Ghibli',
  analog_film: 'Analog Film',
  cinematic: 'Spirited Away',
  fantasy_art: "Howl's Moving Castle",
  anime: 'My Neighbor Totoro',
  digital_art: 'Princess Mononoke',
};

export const GENERATION_TYPE_LABELS = {
  TEXT_TO_IMAGE: 'Text to Art',
  IMAGE_TO_IMAGE: 'Photo to Art',
};

/** `analog_film` → `Analog film`. For values with no friendly label of their own. */
function humanise(value) {
  const spaced = value.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Only text-to-image styles go through the dropdown map, and that distinction matters.
 * The backend hardcodes `style_preset = "anime"` for every photo-to-art request, so
 * running an IMAGE_TO_IMAGE row through the map would label it "My Neighbor Totoro" — a
 * choice the user never made. Those rows show the applied preset instead, which is what
 * `GenerationSummaryResponse` documents the field as meaning for them.
 */
export function styleLabel(style, type) {
  if (!style) {
    return null;
  }
  if (type === 'TEXT_TO_IMAGE' && TEXT_STYLE_LABELS[style]) {
    return TEXT_STYLE_LABELS[style];
  }
  return humanise(style);
}

export function typeLabel(type) {
  return GENERATION_TYPE_LABELS[type] ?? humanise(String(type ?? 'Generation'));
}

/**
 * `createdAt` is an ISO-8601 UTC instant (`2026-08-26T10:15:30.123Z`) rendered in the
 * viewer's own timezone — the point of storing an instant rather than a local time.
 * Returns null rather than "Invalid Date" for a missing or unparseable value.
 */
export function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return null;
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * `imageSizeBytes` is nullable for rows stored before the field existed, so a falsy value
 * means "unknown" and must not render as "0 B". Note the explicit null check: 0 is also
 * falsy, and a zero-byte image is a bug worth showing rather than hiding.
 */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || !Number.isFinite(Number(bytes))) {
    return null;
  }

  const value = Number(bytes);
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(0)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The download filename. Built client-side because the backend's own
 * `Content-Disposition` cannot be read: the response is cross-origin and that header is
 * not CORS-safelisted, and `SecurityConfig` sets no `exposedHeaders`. Reading it would
 * need a backend change, which this phase is not allowed to make — and the header is only
 * a hint for a browser-initiated save anyway.
 */
export function downloadFilename(generation) {
  const stylePart = generation?.style ? `-${generation.style}` : '';
  return `ghibli-art${stylePart}-${generation?.id ?? 'image'}.png`;
}
