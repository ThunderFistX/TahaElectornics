import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, assetUrl } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import Loading from '../components/Loading';
import Breadcrumbs from '../components/Breadcrumbs';

const pageContent = {
  main_product: {
    eyebrow: 'Main Products',
    title: 'Product catalogue',
    description: 'Portable printers and core tools for busy shops, offices, and mobile teams.',
    crumb: 'Products',
    empty: 'No products found.',
    bannerTitle: 'Built for work that keeps moving',
    bannerText: 'Browse durable, compact printing systems ready for labels, pricing, packaging, and field use.'
  },
  accessory: {
    eyebrow: 'Accessories',
    title: 'Accessories catalogue',
    description: 'Labels, cartridges, add-ons, and supporting gear for your printing setup.',
    crumb: 'Accessories',
    empty: 'No accessories found.',
    bannerTitle: 'Complete the setup',
    bannerText: 'Pair your main product with compatible extras that keep every print run smooth.'
  }
};

const ShopProjects = ({ itemType = 'main_product' }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const content = pageContent[itemType] || pageContent.main_product;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/products?itemType=${itemType}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [itemType]);

  return (
    <div className="shop-surface pb-16">
      <section className="relative overflow-hidden border-b border-white/70 bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_42%,#eef2ff_100%)]">
        <div className="responsive-section py-10 sm:py-12">
          <div className="mb-8">
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: content.crumb }]} />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">{content.eyebrow}</span>
          <h1 className="responsive-title mt-3 max-w-3xl font-bold tracking-tight text-slate-950">{content.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">{content.description}</p>
        </div>
      </section>
      <section className="responsive-section py-10 sm:py-12">
      <div className="gradient-banner mb-10 overflow-hidden rounded-[8px] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Featured collection</p>
        <h2 className="mt-3 text-2xl font-bold md:text-4xl">{content.bannerTitle}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82 md:text-base">{content.bannerText}</p>
      </div>
      {loading && <Loading label={`Loading ${itemType === 'accessory' ? 'accessories' : 'products'}...`} />}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const id = project._id || project.id;
          return (
            <div key={id} className="gradient-card group min-w-0 overflow-hidden rounded-[8px] shadow-[0_12px_36px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={assetUrl(project.imageUrl || project.img)} alt={project.title} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                <span className="absolute left-4 top-4 bg-white/95 text-slate-900 px-3 py-1 rounded-full text-xs font-black font-mono shadow-sm">
                  {project.productCode || 'NEW'}
                </span>
              </div>
              <div className="p-5 transition duration-300 group-hover:bg-slate-50">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 mb-2">{project.category || 'Printers'}</p>
                <h2 className="text-xl font-bold text-slate-950 transition group-hover:text-cyan-700">{project.title}</h2>
                <p className="text-sm leading-6 text-slate-500 mt-2 line-clamp-2">{project.shortDescription || project.description}</p>
                <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <span className="text-2xl font-bold text-slate-950">{formatCurrency(project.price)}</span>
                  <Link to={`/product/${id}`} className="gradient-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-bold text-white transition">Details</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && projects.length === 0 && <p className="text-slate-500">{content.empty}</p>}
      </section>
    </div>
  );
};

export default ShopProjects;
