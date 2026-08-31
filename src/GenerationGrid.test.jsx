import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import GenerationGrid from './components/GenerationGrid';
import { fetchGenerationImage } from './services/apiClient';

/**
 * The history grid now withholds its own downloads: one `useImageQueue` per grid decides which slots
 * may `fetch` yet, because twelve authenticated blob requests fired at once made the page fill in byte
 * order — the same assembly bug the homepage queue was written for.
 *
 * Withholding a request is the sharp edge of that, so this suite pins the three ways it must not
 * misfire. Ordering itself is not retested here; `useImageQueue.test.jsx` owns that, and in jsdom the
 * queue is bypassed anyway (no `IntersectionObserver`), which is exactly the fail-open path test one
 * cares about.
 *
 * `fetchGenerationImage` is mocked because it is a real authenticated request to a backend that is not
 * running, and `URL.createObjectURL` because jsdom implements neither it nor `revokeObjectURL`.
 */
vi.mock('./services/apiClient', () => ({
  fetchGenerationImage: vi.fn(),
}));

const rows = [
  { id: 'g1', prompt: 'A quiet hillside at dusk', type: 'text', style: 'general', createdAt: '2026-08-20T10:00:00Z' },
  { id: 'g2', prompt: 'A cat on a windowsill', type: 'photo', createdAt: '2026-08-20T11:00:00Z' },
  { id: 'g3', prompt: 'Rain over a small town', type: 'text', style: 'cinematic', createdAt: '2026-08-20T12:00:00Z' },
  { id: 'g4', prompt: 'A path through tall grass', type: 'photo', createdAt: '2026-08-20T13:00:00Z' },
];

function renderGrid(props = {}) {
  return render(
    <GenerationGrid className="grid" generations={rows} onDelete={vi.fn()} {...props} />,
  );
}

/*
 * Assigned once for the whole file rather than stubbed per test, and that is not tidiness: the card
 * revokes its object URL from an effect *cleanup*, which runs during Testing Library's own `afterEach`
 * — and vitest runs `afterEach` hooks in reverse registration order, so anything torn down here would
 * already be gone by the time the unmount needed it.
 */
let objectUrls = 0;
URL.createObjectURL = vi.fn(() => `blob:mock/${++objectUrls}`); // jsdom implements neither of these
URL.revokeObjectURL = vi.fn();

afterEach(() => {
  vi.clearAllMocks(); // Call records only — each test sets its own `fetchGenerationImage` behaviour
});

test('with no IntersectionObserver every card still requests its blob', async () => {
  expect(window.IntersectionObserver).toBeUndefined(); // jsdom, and every crawler
  fetchGenerationImage.mockImplementation(() => Promise.resolve(new Blob(['png'])));

  renderGrid();

  // The failure this guards against is a grid that never asks for anything: a queue that fails
  // closed leaves four permanent placeholders, which is far worse than four out of order.
  await waitFor(() => expect(fetchGenerationImage).toHaveBeenCalledTimes(rows.length));
  expect(fetchGenerationImage.mock.calls.map(([id]) => id)).toEqual(['g1', 'g2', 'g3', 'g4']);

  expect(await screen.findAllByRole('img')).toHaveLength(rows.length);
});

test('a rejected fetch settles its own slot instead of stalling the ones behind it', async () => {
  const notFound = Object.assign(new Error('gone'), { status: 404 });
  // Card two fails; the queue's window widens on *any* arrival, including this one.
  fetchGenerationImage.mockImplementation((id) =>
    id === 'g2' ? Promise.reject(notFound) : Promise.resolve(new Blob(['png'])),
  );

  renderGrid();

  // 404 is the honest case — the row was deleted in another tab between the list and this request.
  expect(await screen.findByText('This image is no longer available.')).toBeInTheDocument();
  // The other three are unaffected: an error counts as settled, the same rule `useImageLoaded` uses,
  // because a slot that never reported would hold every card below it forever.
  await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(rows.length - 1));
});

test('a slot whose bytes have not landed shows its placeholder, not an empty frame', async () => {
  fetchGenerationImage.mockImplementation(() => new Promise(() => {})); // Never resolves

  const { container } = renderGrid();

  // The structure arrives with the grid — this is the half of the change that is deliberately *not*
  // queued, so the page has its layout immediately and only the artwork inside waits its turn.
  const cards = container.querySelectorAll('article');
  expect(cards).toHaveLength(rows.length);
  cards.forEach((card) => {
    expect(card.classList.contains('opacity-0')).toBe(false);
    expect(card.classList.contains('animate-rise-in')).toBe(true);
  });

  // `isShowing` is `canPreview && isVisible(slot)`, and it gates the whole zoom button rather than
  // just the image's opacity: a picture faded to zero inside a `cursor-zoom-in` button would still
  // open a lightbox on an image nobody can see.
  expect(screen.queryByRole('img')).toBeNull();
  expect(container.querySelectorAll('.animate-pulse')).toHaveLength(rows.length);
  // The prompts are readable throughout, so a slow image never costs the metadata with it.
  expect(screen.getByText('A cat on a windowsill')).toBeInTheDocument();
});
