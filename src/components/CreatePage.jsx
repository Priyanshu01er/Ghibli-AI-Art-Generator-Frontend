import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';
import PhotoToArtSection from './PhotoToArtSection';
import RecentGenerations from './RecentGenerations';
import TextToArtSection from './TextToArtSection';

function CreatePage() {
  const [activeTab, setActiveTab] = useState('photo');

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main className="bg-gradient-to-b from-stone-100 via-brand-50/50 to-brand-100/60">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-center border-b border-stone-200/80 text-lg font-semibold text-slate-500">
            <div className="flex gap-8">
              <button
                type="button"
                onClick={() => setActiveTab('photo')}
                className={`px-2 pb-3 transition-colors ${
                  activeTab === 'photo'
                    ? 'border-b-2 border-brand-700 text-brand-800'
                    : 'hover:text-brand-700'
                }`}
              >
                Photo to Art
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-2 pb-3 transition-colors ${
                  activeTab === 'text'
                    ? 'border-b-2 border-brand-700 text-brand-800'
                    : 'hover:text-brand-700'
                }`}
              >
                Text to Art
              </button>
            </div>
          </div>

          {activeTab === 'photo' ? <PhotoToArtSection /> : <TextToArtSection />}

          {/*
            Outside the tab swap on purpose. The line above unmounts whichever section is
            not active, discarding its in-memory blob URL — so this server-backed strip is
            what keeps a just-generated image on screen across a tab switch, and what brings
            it back after navigating away and returning.
          */}
          <RecentGenerations />

          <div className="mt-6 text-center text-sm text-slate-500">
            <Link to="/#home" className="font-semibold text-brand-700 hover:text-brand-800">
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
