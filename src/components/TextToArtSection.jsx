import { useState } from 'react';
import { generateFromText } from '../services/apiClient';
import { useAuth } from '../context/AuthContext'; // For the userId a stored draft is stamped with
import { blobToDataUrl, clearDraft, readDraft, writeDraft } from '../services/generationDraftStore';
import GenerationErrorNotice from './GenerationErrorNotice'; // Same failure vocabulary as the photo tab

function TextToArtSection() {
  const { user } = useAuth();
  const userId = user?.userId ?? null; // Scopes the draft, so another account never sees it
  // Read once on mount — see PhotoToArtSection for why this is not re-read per render.
  const [restoredDraft] = useState(() => readDraft('text', userId));
  const [style, setStyle] = useState(restoredDraft?.style ?? 'general'); // Dropdown restores too
  const [description, setDescription] = useState(restoredDraft?.prompt ?? '');
  const [generatedImage, setGeneratedImage] = useState(restoredDraft?.dataUrl ?? '');
  const [isLoading, setIsLoading] = useState(false);
  /*
   * Holds the `ApiError` itself, not a pre-flattened sentence: the notice needs `code` and
   * `retryable` to pick its wording and decide whether to offer a retry. Client-side guards
   * below still store a plain string, which `describeGenerationError` renders as-is.
   */
  const [generationError, setGenerationError] = useState(null);
  const canGenerate = description.trim().length > 0 && !isLoading;

  // The revoke-on-unmount effect is gone with the object URL it guarded: `generatedImage` is a
  // persisted `data:` URL now, and this component owns no object URL at all.

  const handleStyleChange = (event) => {
    setStyle(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);

    if (generationError && event.target.value.trim()) {
      setGenerationError(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!description.trim()) {
      setGenerationError('Please enter a description for your artwork.');
      return;
    }

    setIsLoading(true);
    setGenerationError(null);

    try {
      if (generatedImage) {
        setGeneratedImage(''); // Clearing the panel; the stored copy goes with it
        clearDraft('text', userId); // …so a failed retry cannot resurrect the old image
      }

      const resultBlob = await generateFromText(description.trim(), style);
      const dataUrl = await blobToDataUrl(resultBlob); // Base64 so it can outlive this document
      setGeneratedImage(dataUrl);
      // Carries `style` as well, so the dropdown and the image are restored as one result.
      writeDraft('text', userId, {
        dataUrl,
        prompt: description.trim(),
        style,
        savedAt: Date.now(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error generating image from text:', error);
      // The error object goes into state untouched. `GenerationErrorNotice` reads the
      // ProblemDetail `code` off it to name the real cause — an empty Stability balance, a
      // refused prompt, an outage — which a flattened string had already thrown away.
      setGenerationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) {
      return;
    }

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ghibli-art-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset form and generated image when user wants to create another image
  const handleCreateAnother = () => {
    clearDraft('text', userId); // The user-facing end of "kept until Create Another or logout"
    setGeneratedImage('');
    setDescription('');
    setStyle('general');
    setGenerationError(null);
    // Scroll to top after resetting for new generation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-4xl rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Text to Ghibli Art</h1>

      <div className="mt-4 flex min-h-[230px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-center text-lg font-medium text-slate-500 sm:min-h-[260px]">
        {generatedImage ? (
          <img
            src={generatedImage}
            alt="Generated Ghibli art"
            className="max-h-[380px] w-full rounded-xl object-contain sm:max-h-[420px]"
          />
        ) : (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-stone-300 bg-white text-3xl text-slate-400">
              ≡
            </div>
            <p>Generate Ghibli art from your text description</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="ghibli-style" className="mb-2 block text-lg font-semibold text-slate-800">
          Ghibli Style
        </label>
        <select
          id="ghibli-style"
          value={style}
          onChange={handleStyleChange}
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
        >
          <option value="general">General Ghibli</option>
          <option value="analog_film">Analog Film</option>
          <option value="cinematic">Spirited Away</option>
          <option value="fantasy_art">Howl&apos;s Moving Castle</option>
          <option value="anime">My Neighbor Totoro</option>
          <option value="digital_art">Princess Mononoke</option>
        </select>
      </div>

      <div className="mt-3">
        <label htmlFor="text-description" className="mb-2 block text-lg font-semibold text-slate-800">
          Your Description
        </label>
        <textarea
          id="text-description"
          value={description}
          onChange={handleDescriptionChange}
          className="min-h-20 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
          placeholder="Describe the Ghibli scene you want to create in detail..."
        />
        {/* Retry calls the same handler, so it re-reads the live prompt and style rather than
            replaying the request that just failed. The draft is untouched either way. */}
        <GenerationErrorNotice
          error={generationError}
          onRetry={handleGenerateClick}
          isRetrying={isLoading}
        />
      </div>

      {!generatedImage ? (
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!canGenerate}
          className={`mt-6 w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform ${
            canGenerate ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-60'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate Ghibli Art'}
        </button>
      ) : (
        // Same fix as PhotoToArtSection: two flex-1 buttons at text-lg do not fit a 303px phone
        // row, so "Create Another" wrapped mid-word. Stacked below sm, side by side from sm up.
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 sm:px-6 sm:text-lg"
          >
            <span>⤓</span>
            Download
          </button>
          <button
            type="button"
            onClick={handleCreateAnother}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 sm:px-6 sm:text-lg"
          >
            <span>+</span>
            Create Another
          </button>
        </div>
      )}
    </div>
  );
}

export default TextToArtSection;
