import { useEffect, useRef, useState } from 'react';
import { generateFromPhoto } from '../services/apiClient';

function PhotoToArtSection() {
  const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState('');
  const [description, setDescription] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const canTransform = Boolean(selectedImage) && description.trim().length > 0 && !isLoading;

  useEffect(() => {
    return () => {
      if (generatedImage) {
        URL.revokeObjectURL(generatedImage);
      }
      if (selectedPreviewImage) {
        URL.revokeObjectURL(selectedPreviewImage);
      }
    };
  }, [generatedImage, selectedPreviewImage]);

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
      URL.revokeObjectURL(generatedImage);
      setGeneratedImage('');
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
        URL.revokeObjectURL(generatedImage);
        setGeneratedImage('');
      }

      const resultBlob = await generateFromPhoto(selectedImage, description.trim());
      setGeneratedImage(URL.createObjectURL(resultBlob));
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
    if (generatedImage) {
      URL.revokeObjectURL(generatedImage);
    }
    if (selectedPreviewImage) {
      URL.revokeObjectURL(selectedPreviewImage);
    }

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
                alt="Selected image preview"
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
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-6 py-4 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>⤓</span>
              Download
            </button>
            <button
              type="button"
              onClick={handleCreateAnother}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-4 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
