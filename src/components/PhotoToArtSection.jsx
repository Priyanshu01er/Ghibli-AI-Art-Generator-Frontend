import { useEffect, useRef, useState } from 'react';
import { generateFromPhoto } from '../services/apiClient';
import { useAuth } from '../context/AuthContext'; // For the userId a stored draft is stamped with
import useImageLoaded from '../hooks/useImageLoaded'; // Neither picture here had a load fade
import { blobToDataUrl, clearDraft, readDraft, writeDraft } from '../services/generationDraftStore';
import GenerationErrorNotice from './GenerationErrorNotice'; // Same failure vocabulary as the text tab
import GeneratingPanel from './GeneratingPanel'; // The 5-30s wait, made legible

function PhotoToArtSection() {
  const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
  const { user } = useAuth();
  const userId = user?.userId ?? null; // Scopes the draft, so another account never sees it
  /*
   * Read once, in an initialiser: this survives CreatePage unmounting the inactive tab, and a
   * full reload. Held in state rather than re-read per render because the read is a
   * synchronous localStorage hit plus a JSON.parse of ~2.5 MB of base64.
   */
  const [restoredDraft] = useState(() => readDraft('photo', userId));
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState('');
  const [description, setDescription] = useState(restoredDraft?.prompt ?? ''); // Prompt comes back too
  const [generatedImage, setGeneratedImage] = useState(restoredDraft?.dataUrl ?? ''); // …with the art
  const [isLoading, setIsLoading] = useState(false);
  // The drop zone already had `onDragOver`/`onDragLeave` handlers that did nothing but stop the
  // browser's default — so dragging a file over it looked exactly like dragging it anywhere else.
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  /*
   * The `ApiError` itself, not a formatted sentence — the notice switches on its `code` and
   * `retryable`. The upload-size and missing-field guards still store plain strings, which
   * `describeGenerationError` passes straight through with no title and no retry button.
   */
  const [generationError, setGenerationError] = useState(null);
  const fileInputRef = useRef(null);
  const [previewRef, previewLoaded] = useImageLoaded(); // The upload thumbnail
  const [resultRef, resultLoaded] = useImageLoaded(); // The finished artwork
  const canTransform = Boolean(selectedImage) && description.trim().length > 0 && !isLoading;

  // `generatedImage` is a persisted `data:` URL now, so there is nothing to revoke for it —
  // only the upload preview is still an object URL owned by this component.
  useEffect(() => {
    return () => {
      if (selectedPreviewImage) {
        URL.revokeObjectURL(selectedPreviewImage);
      }
    };
  }, [selectedPreviewImage]);

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true); // The only signal the zone gives that it will accept the drop
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false); // Released, so the zone stops advertising itself either way

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const mockEvent = { target: { files: [file] } };
      handleImageChange(mockEvent);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      if (selectedPreviewImage) {
        URL.revokeObjectURL(selectedPreviewImage);
      }
      setSelectedImage(null);
      setSelectedPreviewImage('');
      setGenerationError('Image is too large. Please select an image up to 5MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (selectedPreviewImage) {
      URL.revokeObjectURL(selectedPreviewImage);
    }

    if (generatedImage) {
      setGeneratedImage(''); // No revoke: a data URL holds no object-URL handle
      clearDraft('photo', userId); // A new upload supersedes the saved result as well
    }

    setSelectedImage(file);
    setSelectedPreviewImage(file ? URL.createObjectURL(file) : '');

    if (generationError && file) {
      setGenerationError(null);
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);

    if (generationError && event.target.value.trim()) {
      setGenerationError(null);
    }
  };

  const handleTransformClick = async () => {
    if (!selectedImage) {
      setGenerationError('Please upload an image before transforming.');
      return;
    }

    if (!description.trim()) {
      setGenerationError('Please add additional details for better results.');
      return;
    }

    setIsLoading(true);
    setGenerationError(null);

    try {
      if (generatedImage) {
        setGeneratedImage(''); // Clearing the panel; the stored copy goes with it
        clearDraft('photo', userId); // …so a failed retry cannot resurrect the old image
      }

      const resultBlob = await generateFromPhoto(selectedImage, description.trim());
      // Base64, not URL.createObjectURL: an object URL dies with this document, so it could
      // never be restored after a reload. See generationDraftStore for the full reasoning.
      const dataUrl = await blobToDataUrl(resultBlob);
      setGeneratedImage(dataUrl);
      // Best-effort: a false return (quota) only costs persistence, never the image on screen.
      writeDraft('photo', userId, { dataUrl, prompt: description.trim(), savedAt: Date.now() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error generating image:', error);
      // Stored as-is rather than formatted into "Network response was not ok. Status: 502…",
      // which was the same sentence for an empty balance, a refused prompt and an outage.
      // `GenerationErrorNotice` reads the ProblemDetail `code` and says which one it was.
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

  const handleCreateAnother = () => {
    if (selectedPreviewImage) {
      URL.revokeObjectURL(selectedPreviewImage);
    }

    clearDraft('photo', userId); // The user-facing end of "kept until Create Another or logout"
    setGeneratedImage('');
    setSelectedImage(null);
    setSelectedPreviewImage('');
    setDescription('');
    setGenerationError(null);

    // Reset the hidden file input so the same image can be selected again.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Both cards arrive rather than appear, 80ms apart, so the form reads left-then-right. A plain
          `animate-rise-in` and no observer: `CreatePage` unmounts the inactive tab, so this replays on
          every tab switch — which is exactly what makes the swap feel like a swap instead of a cut.
          Safe because `rise-in` fills `backwards` and leaves no transform behind. */}
      <div className="animate-rise-in rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 motion-reduce:animate-none sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Photo to Ghibli Art</h1>

        <div
          /* The drop zone now answers a drag: brand border, a faint warm tint and a hair of scale,
             all on one transition. `scale-[1.01]` and not more — a panel that jumps under the cursor
             reads as a misclick. */
          className={`mt-4 rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ease-exit sm:p-6 ${
            isDraggingOver
              ? 'scale-[1.01] border-brand-500 bg-brand-50 ease-settle'
              : 'border-stone-300 bg-stone-50/80'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {selectedPreviewImage ? (
            <div>
              <img
                ref={previewRef}
                src={selectedPreviewImage}
                alt="Preview of the file you selected"
                /* Develops out of a blur like every other picture on the site. Safe on the `<img>`
                   itself because this one owns no `transition-transform` to collide with. */
                className={`mx-auto max-h-[220px] w-full rounded-xl object-contain motion-reduce:animate-none sm:max-h-[250px] ${
                  previewLoaded ? 'animate-develop-in' : 'opacity-0'
                }`}
              />
              {selectedImage ? <p className="mt-3 text-sm text-slate-500">Selected: {selectedImage.name}</p> : null}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="mt-4 rounded-xl bg-stone-200 px-5 py-3 text-base font-semibold text-slate-700 transition-colors duration-200 hover:bg-stone-300"
              >
                Browse another file
              </button>
            </div>
          ) : (
            <div>
              {/* Scales with the zone's own drag state, so the icon leads the hint rather than
                  sitting inert while the border changes around it. */}
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-white text-2xl text-slate-400 transition-transform duration-200 ease-exit ${
                  isDraggingOver ? 'scale-110 border-brand-500 ease-settle' : 'border-stone-300'
                }`}
              >
                ⌘
              </div>
              <p className="mt-5 text-lg font-medium text-slate-600">
                {isDraggingOver ? 'Drop it to upload' : 'Drag and drop your image here'}
              </p>
              <p className="mt-1 text-sm text-slate-400">or</p>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="mt-4 rounded-xl bg-stone-200 px-5 py-3 text-base font-semibold text-slate-700 transition-colors duration-200 hover:bg-stone-300"
              >
                Browse files
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-lg font-semibold text-slate-800">Additional Details</label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            // The focus ring had a `transition-shadow` with no duration, so it snapped on at 150ms.
            className="min-h-20 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition-shadow duration-200 ease-entrance placeholder:text-slate-400 focus:shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
            placeholder="Add any specific details or enhancements..."
          />
        </div>

        <button
          type="button"
          onClick={handleTransformClick}
          disabled={!canTransform}
          className={`mt-6 w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform duration-300 ease-exit ${
            canTransform
              ? 'hover:-translate-y-0.5 hover:duration-200 hover:ease-settle'
              : 'cursor-not-allowed opacity-60'
          }`}
        >
          {isLoading ? 'Transforming...' : 'Transform to Ghibli Art'}
        </button>
        {/* Retry re-enters the same handler, so the current upload and prompt are used — both
            survive the failure, which is what the notice's copy promises. */}
        <GenerationErrorNotice
          error={generationError}
          onRetry={handleTransformClick}
          isRetrying={isLoading}
        />
      </div>

      <div className="animate-rise-in rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 motion-reduce:animate-none [animation-delay:80ms] sm:p-6">
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-center text-lg font-medium text-slate-500 sm:min-h-[280px]">
          {/* Three states, in priority order: working, finished, empty. `isLoading` leads because it
              is the only one of the three the old markup had no branch for at all. */}
          {isLoading ? (
            <GeneratingPanel label="Painting your Ghibli art…" />
          ) : generatedImage ? (
            <img
              ref={resultRef}
              src={generatedImage}
              alt="Generated Ghibli art"
              className={`max-h-[380px] w-full rounded-xl object-contain motion-reduce:animate-none sm:max-h-[420px] ${
                resultLoaded ? 'animate-develop-in' : 'opacity-0'
              }`}
            />
          ) : (
            'Your generated Ghibli art will appear here.'
          )}
        </div>

        {generatedImage && !isLoading ? (
          // Stacked below sm: as `flex-1` siblings each button got ~143px of a 303px row while
          // "Create Another" needs ~188px at text-lg, so the label wrapped mid-word inside the
          // button. Full width each on a phone, side by side from sm up.
          // `rise-in` so the row arrives with the artwork instead of snapping into existence under it.
          <div className="mt-6 flex animate-rise-in flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle flex items-center justify-center gap-2 sm:px-6 sm:py-4 sm:text-lg"
            >
              <span>⤓</span>
              Download
            </button>
            <button
              type="button"
              onClick={handleCreateAnother}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform duration-300 ease-exit hover:-translate-y-0.5 hover:duration-200 hover:ease-settle flex items-center justify-center gap-2 sm:px-6 sm:py-4 sm:text-lg"
            >
              <span>+</span>
              Create Another
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PhotoToArtSection;
