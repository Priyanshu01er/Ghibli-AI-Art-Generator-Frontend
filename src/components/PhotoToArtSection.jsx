import { useEffect, useRef, useState } from 'react';
import { generateFromPhoto } from '../services/apiClient';
import { useAuth } from '../context/AuthContext'; // For the userId a stored draft is stamped with
import { blobToDataUrl, clearDraft, readDraft, writeDraft } from '../services/generationDraftStore';

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
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
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
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

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
      setErrorMessage('Image is too large. Please select an image up to 5MB.');
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

    if (errorMessage && file) {
      setErrorMessage('');
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);

    if (errorMessage && event.target.value.trim()) {
      setErrorMessage('');
    }
  };

  const handleTransformClick = async () => {
    if (!selectedImage) {
      setErrorMessage('Please upload an image before transforming.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please add additional details for better results.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

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
      // Keep the existing wording. `error.message` is now the ProblemDetail `detail`
      // from the backend instead of the raw text/plain body.
      const message =
        error.status !== undefined
          ? `Network response was not ok. Status: ${error.status}. Message: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Failed to generate image.';
      setErrorMessage(message);
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
    setErrorMessage('');

    // Reset the hidden file input so the same image can be selected again.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Photo to Ghibli Art</h1>

        <div 
          className="mt-4 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/80 p-5 text-center sm:p-6"
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
                src={selectedPreviewImage}
                alt="Preview of the file you selected"
                className="mx-auto max-h-[220px] w-full rounded-xl object-contain sm:max-h-[250px]"
              />
              {selectedImage ? <p className="mt-3 text-sm text-slate-500">Selected: {selectedImage.name}</p> : null}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="mt-4 rounded-xl bg-stone-200 px-5 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-stone-300"
              >
                Browse another file
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-300 bg-white text-2xl text-slate-400">
                ⌘
              </div>
              <p className="mt-5 text-lg font-medium text-slate-600">Drag and drop your image here</p>
              <p className="mt-1 text-sm text-slate-400">or</p>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="mt-4 rounded-xl bg-stone-200 px-5 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-stone-300"
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
            className="min-h-20 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-700 outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
            placeholder="Add any specific details or enhancements..."
          />
        </div>

        <button
          type="button"
          onClick={handleTransformClick}
          disabled={!canTransform}
          className={`mt-6 w-full rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform ${
            canTransform ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-60'
          }`}
        >
          {isLoading ? 'Transforming...' : 'Transform to Ghibli Art'}
        </button>
        {errorMessage ? <p className="mt-3 text-sm font-medium text-red-600">{errorMessage}</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200 sm:p-6">
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-center text-lg font-medium text-slate-500 sm:min-h-[280px]">
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated Ghibli art"
              className="max-h-[380px] w-full rounded-xl object-contain sm:max-h-[420px]"
            />
          ) : (
            'Your generated Ghibli art will appear here.'
          )}
        </div>

        {generatedImage ? (
          // Stacked below sm: as `flex-1` siblings each button got ~143px of a 303px row while
          // "Create Another" needs ~188px at text-lg, so the label wrapped mid-word inside the
          // button. Full width each on a phone, side by side from sm up.
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 sm:px-6 sm:py-4 sm:text-lg"
            >
              <span>⤓</span>
              Download
            </button>
            <button
              type="button"
              onClick={handleCreateAnother}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-4 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 sm:px-6 sm:py-4 sm:text-lg"
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
