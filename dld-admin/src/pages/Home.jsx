import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, assetUrl } from '../lib/api';
import { FiArrowLeft, FiArrowRight, FiPrinter, FiShield, FiTruck, FiZap } from 'react-icons/fi';
import Loading from '../components/Loading';
import { BRAND_NAME } from '../lib/catalog';
import ProductCarousel from '../components/ProductCarousel';
import ConsolePreview from '../components/ConsolePreview';

const Home = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const slideDragStart = useRef(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
          const data = await response.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const tags = ['Handheld Printers', 'Mini Printers', 'Thermal Labels', 'Ink Cartridges', 'Accessories'];
  const mainProducts = projects.filter((project) => (project.itemType || 'main_product') === 'main_product');
  const accessories = projects.filter((project) => project.itemType === 'accessory');
  const featuredProducts = mainProducts.length ? mainProducts : projects;
  const heroProduct = featuredProducts[0];
  const slides = [
    {
      image: '/storefront/hero-printers.png',
      title: 'Portable printers',
      href: heroProduct ? `/product/${heroProduct._id || heroProduct.id}` : '/projects'
    },
    {
      image: '/storefront/hero-labels.png',
      title: 'Labels and cartridges',
      href: '/projects'
    },
    {
      image: '/storefront/hero-delivery.png',
      title: 'Delivery-ready support',
      href: '/projects'
    }
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const showPreviousSlide = () => {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  };

  const showNextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  const startHeroSwipe = (event) => {
    slideDragStart.current = event.clientX;
  };

  const endHeroSwipe = (event) => {
    if (slideDragStart.current === null) return;
    const delta = event.clientX - slideDragStart.current;
    slideDragStart.current = null;
    if (Math.abs(delta) < 45) return;
    if (delta > 0) {
      showPreviousSlide();
    } else {
      showNextSlide();
    }
  };

  return (
    <div className="shop-surface pb-16">
      <section className="bg-[radial-gradient(circle_at_10%_10%,rgba(20,184,166,0.22),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(249,115,22,0.18),transparent_26%),linear-gradient(135deg,#ffffff_0%,#f0fdfa_48%,#eef2ff_100%)]">
        <div className="responsive-section grid grid-cols-1 items-stretch gap-6 py-8 sm:gap-8 sm:py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="flex flex-col justify-center border-y border-l-0 border-white/70 py-8 sm:py-10 lg:border-l lg:px-10">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 shadow-sm">
              <FiZap /> New Storefront
            </span>
            <h1 className="responsive-title max-w-xl font-bold tracking-tight text-slate-950">
              Compact printing for modern work.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Browse handheld mini printers, labels, cartridges, and portable printing accessories selected for shops, offices, and mobile teams.</p>
            <div className="mb-8 mt-7 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">{tag}</span>
              ))}
            </div>
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
              <Link to="/projects" className="gradient-button inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-bold text-white">
                Shop Products <FiArrowRight />
              </Link>
              <Link to="/accessories" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-slate-950 shadow-sm hover:bg-orange-100">
                Accessories <FiArrowRight />
              </Link>
            </div>
          </div>
          <div
            className="relative min-h-[20rem] overflow-hidden rounded-[8px] bg-gradient-to-br from-white via-slate-50 to-cyan-50 shadow-[0_24px_70px_rgba(15,23,42,0.16)] touch-pan-y sm:min-h-[26rem] lg:rounded-none"
            onPointerDown={startHeroSwipe}
            onPointerUp={endHeroSwipe}
            onPointerCancel={() => {
              slideDragStart.current = null;
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.image}
                className={`absolute inset-3 overflow-hidden rounded-[8px] transition duration-700 sm:inset-5 lg:inset-6 ${index === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  draggable="false"
                  className="h-full w-full select-none object-contain"
                />
              </div>
            ))}
            <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 justify-between">
              <button type="button" onClick={showPreviousSlide} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg hover:bg-cyan-300" aria-label="Previous slide" title="Previous slide">
                <FiArrowLeft />
              </button>
              <button type="button" onClick={showNextSlide} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg hover:bg-cyan-300" aria-label="Next slide" title="Next slide">
                <FiArrowRight />
              </button>
            </div>
            <div className="absolute right-6 top-6 flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-cyan-300' : 'w-2.5 bg-white/80 hover:bg-white'}`}
                  aria-label={`Show ${slide.title}`}
                  title={slide.title}
                />
              ))}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-white/92 px-4 py-3 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:px-5 sm:py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Featured</p>
                <p className="font-black text-slate-950">{slides[activeSlide].title}</p>
              </div>
              <Link to={slides[activeSlide].href} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-600">
                View
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/70 bg-white/80">
        <div className="responsive-section grid grid-cols-1 gap-3 py-10 md:grid-cols-3">
            {[
              { icon: <FiPrinter />, title: 'Portable printing', text: 'Compact products for labels, dates, prices, and packaging.' },
              { icon: <FiShield />, title: 'Admin managed products', text: 'Every product is added and reviewed from the admin panel.' },
              { icon: <FiTruck />, title: 'Delivery ready', text: 'Product details are prepared for future ordering.' }
            ].map((item) => (
              <div key={item.title} className="gradient-card flex gap-4 rounded-[8px] p-6 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
                <div className="text-cyan-600 text-2xl mt-1">{item.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="responsive-section py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Featured</span>
            <h2 className="text-3xl font-bold text-slate-950 mt-2">Featured products</h2>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-cyan-700">View all <FiArrowRight /></Link>
        </div>
        {loading && <Loading label="Loading products..." />}
        <ProductCarousel products={featuredProducts} />
        {!loading && featuredProducts.length === 0 && <p className="text-slate-500">No products are available yet.</p>}
      </section>
      <section className="responsive-section pb-14 sm:pb-16">
        <div className="gradient-banner overflow-hidden rounded-[8px] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Accessories</p>
              <h2 className="mt-2 text-2xl font-bold md:text-4xl">Keep every print run supplied.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82">
                {accessories.length ? `${accessories.length} accessory options are ready to browse.` : 'Labels, cartridges, and add-ons are organized in their own collection.'}
              </p>
            </div>
            <Link to="/accessories" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:bg-orange-100">
              Shop Accessories <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
      <ConsolePreview />
    </div>
  );
};

export default Home;
