import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CtaSection from './CtaSection';
import DetailSection from './DetailSection';
import FaqSection from './FaqSection';
import FeaturesSection from './FeaturesSection';
import Footer from './Footer';
import GallerySection from './GallerySection';
import Header from './Header';
import HeroSection from './HeroSection';
import InspirationSection from './InspirationSection'; // Quotes + the H1–H4 landscapes

function HomePage() {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeMap = {
      '/home': { sectionId: 'home', offset: 96 },
      '/features': { sectionId: 'features', offset: 16 },
      '/gallery': { sectionId: 'gallery', offset: 16 },
      '/faq': { sectionId: 'faq', offset: 72 },
    };

    if (pathname === '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    const routeConfig = routeMap[pathname];
    if (!routeConfig) {
      return;
    }

    const section = document.getElementById(routeConfig.sectionId);
    if (!section) {
      return;
    }

    const y = section.getBoundingClientRect().top + window.scrollY - routeConfig.offset;
    window.scrollTo({ top: Math.max(y, 0), left: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className="min-h-screen text-slate-800">
      <Header />

      <main>
        <HeroSection />
        <FeaturesSection />
        <GallerySection />
        <DetailSection />
        {/* Between the product story and the FAQ: it reads as the emotional close of the pitch
            and gives the page a breath before a wall of questions. Nothing above or below moved. */}
        <InspirationSection />
        <FaqSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
