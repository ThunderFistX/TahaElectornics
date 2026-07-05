import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL, assetUrl } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import Loading from '../components/Loading';
import Breadcrumbs from '../components/Breadcrumbs';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data);
        }
      } catch (error) {
        console.error("Error fetching product", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <Loading label="Loading product details..." />;
  if (!product) return <div className="text-center py-20 text-red-500">Product not found.</div>;

  const isAccessory = product.itemType === 'accessory';
  const listingPath = isAccessory ? '/accessories' : '/projects';
  const listingLabel = isAccessory ? 'Accessories' : 'Products';

  return (
    <div className="shop-surface pb-16">
      <section className="border-b border-white/70 bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_42%,#eef2ff_100%)]">
        <div className="responsive-section py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: listingLabel, to: listingPath },
              { label: product.category || 'Category', to: listingPath },
              { label: product.title }
            ]}
          />
        </div>
      </section>
      <section className="responsive-section py-10 sm:py-12">
      <div className="gradient-card grid grid-cols-1 overflow-hidden rounded-[8px] shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:grid-cols-2">
        <div className="aspect-[4/3] bg-slate-100 lg:aspect-auto lg:min-h-[420px]">
          <img 
            src={assetUrl(product.imageUrl)} 
            alt={product.title} 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="space-y-6 p-5 sm:p-8 lg:space-y-7 lg:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-slate-950 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono">
              ID {product.productCode || 'Product'}
            </span>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-700">{listingLabel}</span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">{product.category}</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl md:text-5xl">{product.title}</h1>
          <p className="text-slate-500 leading-relaxed text-lg">{product.shortDescription}</p>
          <div className="prose max-w-none text-slate-600 whitespace-pre-line">
            {product.description}
          </div>
          
          <div className="pt-7 border-t border-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.18em]">Price</p>
                <p className="text-4xl font-bold text-slate-950 sm:text-5xl">{formatCurrency(product.price)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
    </div>
  );
};

export default ProductDetail;
