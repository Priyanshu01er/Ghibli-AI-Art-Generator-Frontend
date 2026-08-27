import animeSceneOne from '../assets/A1.png';
import animeSceneTwo from '../assets/A2.webp';
// Repointed: the three files these lines imported (0-2.webp, 802816d8…jpg, fe319a5c…webp) are
// no longer in src/assets, so the whole app failed to compile with "Module not found". S1–S3
// were sitting unused in the same folder; swap in replacements to change these tiles back.
import galleryOne from '../assets/S1.png';
import galleryTwo from '../assets/S2.png';
import galleryThree from '../assets/S3.png';
import galleryFour from '../assets/OIP.webp';
import mountainLakeOne from '../assets/ML1.jpg';
import mountainLakeTwo from '../assets/ML2.jpg';

const magicalGalleryItems = [galleryOne, galleryTwo, galleryThree, galleryFour];

function GallerySection() {
  return (
    <section id="gallery" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="text-center font-heading text-4xl font-bold text-slate-900 sm:text-5xl">
        Magical Transformations Gallery
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {magicalGalleryItems.map((src, index) => (
          <figure key={src} className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-200">
            <img
              src={src}
              alt={`Ghibli style sample ${index + 1}`}
              className="h-56 w-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </figure>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-stone-200">
          <h3 className="text-2xl font-semibold tracking-tight whitespace-nowrap lg:text-3xl">
            Mountain Lake Ghibli Transformation
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-xl">
              <img
                src={mountainLakeOne}
                alt="Mountain lake example 1"
                className="h-52 w-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </figure>
            <figure className="overflow-hidden rounded-xl">
              <img
                src={mountainLakeTwo}
                alt="Mountain lake example 2"
                className="h-52 w-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </figure>
          </div>
        </article>
        <article className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-stone-200">
          <h3 className="text-2xl font-semibold tracking-tight whitespace-nowrap lg:text-3xl">
            Anime Scene Ghibli Transformation
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-xl">
              <img
                src={animeSceneOne}
                alt="Anime scene example 1"
                className="h-52 w-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </figure>
            <figure className="overflow-hidden rounded-xl">
              <img
                src={animeSceneTwo}
                alt="Anime scene example 2"
                className="h-52 w-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </figure>
          </div>
        </article>
      </div>
    </section>
  );
}

export default GallerySection;