import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom'; // useSearchParams: the footer's ?tab= links
import { useAuth } from '../context/AuthContext';
import { readActiveKind, writeActiveKind } from '../services/generationDraftStore';
import Footer from './Footer';
import Header from './Header';
import PhotoToArtSection from './PhotoToArtSection';
import RecentGenerations from './RecentGenerations';
import TextToArtSection from './TextToArtSection';

/** Only these two are tabs; anything else in `?tab=` is ignored rather than trusted. */
function asKind(value) {
  return value === 'photo' || value === 'text' ? value : null;
}

/**
 * Mapped rather than written twice, so the underline markup below — which is now four lines instead
 * of one class — exists once. Order is the on-screen order.
 */
const TABS = [
  { kind: 'photo', label: 'Photo to Art' },
  { kind: 'text', label: 'Text to Art' },
];

function CreatePage() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  const [searchParams] = useSearchParams();
  const requestedTab = asKind(searchParams.get('tab')); // Explicit link target, if there is one
  // An explicit ?tab= wins; otherwise reopen whichever tab was last used, which is the one
  // holding a stored result. Falls back to photo for a first visit.
  const [activeTab, setActiveTab] = useState(() => requestedTab ?? readActiveKind(userId) ?? 'photo');

  /*
   * A footer link to /create?tab=text while already on /create changes only the query, so this
   * page is not remounted and `ScrollToTop` in App.jsx — which watches `pathname` alone —
   * does nothing. Re-applying the param here is what makes those links work from /create.
   */
  useEffect(() => {
    if (!requestedTab) {
      return;
    }
    setActiveTab(requestedTab);
    writeActiveKind(requestedTab, userId);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [requestedTab, userId]);

  const handleTabClick = (kind) => {
    setActiveTab(kind);
    writeActiveKind(kind, userId); // Remembered, so leaving and returning reopens this tab
  };

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          {/* gap-8 + text-lg put the two tab labels 32px apart in a 343px row; tighter and one
              size down below sm so they read as a pair of tabs, not two separate buttons. */}
          {/* `animate-rise-in` rather than a `useRevealOnScroll` reveal: this row is the first thing
              on the page, so an observer would only ever fire on mount anyway. */}
          <div className="mb-6 flex animate-rise-in items-center justify-center border-b border-stone-200/80 text-base font-semibold text-slate-500 motion-reduce:animate-none sm:mb-8 sm:text-lg">
            <div className="flex gap-4 sm:gap-8">
              {TABS.map(({ kind, label }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleTabClick(kind)}
                  // `relative` for the sliding underline below; the colour keeps its own transition.
                  className={`relative px-2 pb-3 transition-colors duration-200 ${
                    activeTab === kind ? 'text-brand-800' : 'hover:text-brand-700'
                  }`}
                >
                  {label}
                  {/* This used to be `border-b-2` on the active button, which had two problems: it
                      could only appear, never move, and a 2px bottom border made the active button
                      taller than its neighbour inside an `items-center` row — so both labels shifted
                      about a pixel on every switch. An absolutely-positioned span has no box, so the
                      jitter is gone, and it can grow from the left instead of blinking on. */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-brand-700 transition-transform duration-300 ease-entrance ${
                      activeTab === kind ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'photo' ? <PhotoToArtSection /> : <TextToArtSection />}

          {/*
            Outside the tab swap on purpose. The line above still unmounts whichever section is
            not active — but each one now restores its own result from `generationDraftStore`,
            so this server-backed strip is the browsable archive rather than the only way a
            just-generated image survives a tab switch.
          */}
          <RecentGenerations />

          <div className="mt-6 text-center text-sm text-slate-500">
            <Link
              to="/#home"
              className="font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CreatePage;
