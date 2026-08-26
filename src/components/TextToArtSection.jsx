import { useEffect, useState } from 'react';
import { generateFromText } from '../services/apiClient';

function TextToArtSection() {
  const [style, setStyle] = useState('general');
  const [description, setDescription] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const canGenerate = description.trim().length > 0 && !isLoading;

  useEffect(() => {
    return () => {
      if (generatedImage) {
        URL.revokeObjectURL(generatedImage);
      }
    };
  }, [generatedImage]);

  const handleStyleChange = (event) => {
    setStyle(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);

    if (errorMessage && event.target.value.trim()) {
      setErrorMessage('');
    }
  };

  const handleGenerateClick = async () => {
    if (!description.trim()) {
      setErrorMessage('Please enter a description for your artwork.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (generatedImage) {
        URL.revokeObjectURL(generatedImage);
        setGeneratedImage('');
      }

      const resultBlob = await generateFromText(description.trim(), style);
      setGeneratedImage(URL.createObjectURL(resultBlob));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error generating image from text:', error);
      // This endpoint used to return an empty 500 body, so the UI could only ever show a
      // generic line. It now returns a ProblemDetail, so show the real cause when there is
      // one and keep the original wording for network-level failures.
      setErrorMessage(
        error.status !== undefined && error.message
          ? error.message
          : 'Failed to generate image. Please ensure backend is running and try again.',
      );
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
    if (generatedImage) {
      URL.revokeObjectURL(generatedImage);
    }
    setGeneratedImage('');
    setDescription('');
    setStyle('general');
    setErrorMessage('');
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
        {errorMessage ? <p className="mt-2 text-sm font-medium text-red-600">{errorMessage}</p> : null}
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
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-800 to-brand-700 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>⤓</span>
            Download
          </button>
          <button
            type="button"
            onClick={handleCreateAnother}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-700 to-amber-800 px-6 py-3.5 text-lg font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
