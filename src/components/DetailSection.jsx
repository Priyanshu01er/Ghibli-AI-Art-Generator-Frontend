import photoToGhibliImage from '../assets/P1.png';

function DetailSection() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-10 lg:px-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">Photo to Ghibli Art</h2>
        {/* This paragraph is ~90 words; at text-lg it filled most of a phone screen on its own. */}
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg lg:text-xl">
          Transform any photo into beautiful Studio Ghibli-style artwork with our Ghibli AI. Simply upload your image and
          describe elements you want to enhance - mood, scene setting, character details - and our advanced Ghibli image
          generator will craft a complete transformation that captures the iconic Ghibli art aesthetic that Studio Ghibli
          fans love.
        </p>
        <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Simple Ghibli AI Prompting</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Use everyday language to guide the Studio Ghibli transformation with our Ghibli generator. No artistic
              background required. Our Ghibli AI translates your vision into perfect Ghibli art imagery with authentic Studio
              Ghibli qualities.
            </p>
          </li>
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Ghibli Art Style Control</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Select specific Studio Ghibli film influences like 'Spirited Away,' 'Howl's Moving Castle,' or 'My Neighbor
              Totoro' with our Ghibli image generator to customize your Ghibli artwork's aesthetic to your exact preferences.
            </p>
          </li>
          <li className="rounded-xl bg-white p-5 shadow-card ring-1 ring-stone-200">
            <h3 className="text-xl font-semibold sm:text-2xl">Ghibli Character Integration</h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              Our Ghibli AI can seamlessly integrate your pets or family members into the Studio Ghibli universe, maintaining
              their recognizable features while giving them distinctive Ghibli art charm in every Ghibli image we generate.
            </p>
          </li>
        </ul>
      </div>

      {/* The other grid column is a heading, a paragraph and three cards, so on a laptop this
          row is ~900px tall and `h-full object-cover` cropped the artwork to a sliver. Capped
          height here, and a fixed height below lg where the figure is not stretched at all. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-200 via-orange-100 to-orange-300 p-3 shadow-card sm:p-4 lg:max-h-[680px]">
        <img
          src={photoToGhibliImage}
          alt="Main showcase"
          className="h-64 w-full rounded-2xl object-cover sm:h-80 lg:h-full"
        />
      </div>
    </section>
  );
}

export default DetailSection;