/**
 * The one place a just-generated image is persisted, so it outlives the component that made
 * it: a tab switch on `/create`, a navigation to another section, or a full reload.
 *
 * Shaped like `authStorage` on purpose — a plain module (no React, so the sections can read
 * it in a `useState` initialiser), one versioned key, and every `localStorage` touch funnelled
 * through the `storage()` accessor below.
 *
 * ── Why a data URL and not the `blob:` URL ───────────────────────────────────────────────
 * An object URL is scoped to the document that created it, so a persisted `blob:` string is a
 * broken image after the next reload. The bytes have to be inlined as base64, which is why
 * `blobToDataUrl` lives here rather than in a component.
 *
 * ── Quota, and why writing can fail ─────────────────────────────────────────────────────
 * An SDXL PNG is 1.5–2 MB, and base64 adds a third — so one slot is ~2.5 MB against an origin
 * allowance of about 5 MB. Two filled slots can overflow. `writeDraft` handles that by
 * evicting the *other* slot and retrying once, and reports failure rather than throwing: the
 * user has already been handed the image, and a bookkeeping problem must never look like a
 * failed generation.
 *
 * ── Ownership ───────────────────────────────────────────────────────────────────────────
 * The record is stamped with the `userId` it belongs to, and `readOwnRecord` drops a record
 * belonging to anybody else. That is what covers a token expiring and a second account
 * signing in on the same browser, with no hook into the 401 path.
 */

/** Bumped if the shape below changes, so an old record is ignored rather than mis-read. */
const STORAGE_KEY = 'ghbli.draft.v1';

/*
 * { userId, activeKind: 'photo' | 'text',
 *   photo: { dataUrl, prompt, savedAt } | null,
 *   text:  { dataUrl, prompt, style, savedAt } | null }
 */

/** Safari private mode throws on access, and `window` is absent under a non-jsdom runner. */
function storage() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function isKind(kind) {
  return kind === 'photo' || kind === 'text';
}

/** A slot is only usable if it still carries renderable bytes. */
function isSlot(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.dataUrl === 'string' &&
      value.dataUrl.startsWith('data:'),
  );
}

function readRecord() {
  const store = storage();
  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null; // Unparseable — treated as no draft, and overwritten by the next write.
  }
}

/** Throws on a full quota; `writeDraft` is the only caller that has to survive that. */
function persist(record) {
  const store = storage();
  if (store) {
    store.setItem(STORAGE_KEY, JSON.stringify(record));
  }
}

/** The stored record, but only if it belongs to `userId`. */
function readOwnRecord(userId) {
  const record = readRecord();
  if (!record || !userId) {
    return null; // No userId means ownership cannot be proven, so behave as if empty.
  }

  if (record.userId !== userId) {
    clearAllDrafts(); // Someone else's leftovers: never show them, never keep them.
    return null;
  }

  return record;
}

/** Reads `blob` as a base64 `data:` URL. Rejects if the blob cannot be read. */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the generated image.'));
    reader.readAsDataURL(blob);
  });
}

export function readDraft(kind, userId) {
  if (!isKind(kind)) {
    return null;
  }

  const slot = readOwnRecord(userId)?.[kind];
  return isSlot(slot) ? slot : null;
}

/** @returns false when the draft could not be stored — the caller keeps its in-memory copy. */
export function writeDraft(kind, userId, slot) {
  if (!isKind(kind) || !userId || !isSlot(slot)) {
    return false;
  }

  const existing = readOwnRecord(userId);
  const record = {
    userId,
    activeKind: kind, // Generating in a tab is also the strongest signal of which tab to reopen.
    photo: isSlot(existing?.photo) ? existing.photo : null,
    text: isSlot(existing?.text) ? existing.text : null,
  };
  record[kind] = slot;

  try {
    persist(record);
    return true;
  } catch {
    // Out of room. The slot being written is the image on screen, so the other one goes.
    record[kind === 'photo' ? 'text' : 'photo'] = null;

    try {
      persist(record);
      return true;
    } catch {
      clearAllDrafts(); // Better nothing than a half-written record we would restore from.
      return false;
    }
  }
}

/** Called by "Create Another", and when a new upload replaces the previous result. */
export function clearDraft(kind, userId) {
  const record = readOwnRecord(userId);
  if (!isKind(kind) || !record) {
    return;
  }

  try {
    persist({ ...record, [kind]: null }); // Keeps activeKind; only the bytes go.
  } catch {
    clearAllDrafts();
  }
}

/** Called on logout — the other end of "until the user clicks Create Another or logs out". */
export function clearAllDrafts() {
  const store = storage();
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing left to try; the in-memory UI state is unaffected either way.
  }
}

/** Which tab was last used, so returning to /create reopens the one holding a result. */
export function readActiveKind(userId) {
  const activeKind = readOwnRecord(userId)?.activeKind;
  return isKind(activeKind) ? activeKind : null;
}

export function writeActiveKind(kind, userId) {
  const existing = readOwnRecord(userId);
  if (!isKind(kind) || !userId || existing?.activeKind === kind) {
    return; // Already recorded: skip the write rather than re-serialise megabytes of base64.
  }

  try {
    persist({
      userId,
      activeKind: kind,
      photo: isSlot(existing?.photo) ? existing.photo : null,
      text: isSlot(existing?.text) ? existing.text : null,
    });
  } catch {
    // Remembering the tab is not worth discarding a stored image for.
  }
}
