import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { assetUrl } from '../lib/api';
import { formatCurrency } from '../lib/currency';

const ProductCarousel = ({ products = [] }) => {
  const trackRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [dragging, setDragging] = useState(false);

  const scrollByCard = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * 340,
      behavior: 'smooth'
    });
  };

  const startDrag = (event) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: track.scrollLeft
    };
    setDragging(true);
    track.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    const track = trackRef.current;
    if (!track || !dragState.current.active) return;
    const delta = event.clientX - dragState.current.startX;
    track.scrollLeft = dragState.current.scrollLeft - delta;
  };

  const stopDrag = () => {
    dragState.current.active = false;
    setDragging(false);
  };

  if (!products.length) return null;

  return (
    <div className="gradient-card relative overflow-hidden rounded-[8px] bg-white/78 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-4 md:p-6">
      <div className="mb-5 flex justify-end gap-2">
        <button type="button" onClick={() => scrollByCard(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-950 hover:text-slate-950" aria-label="Previous products" title="Previous products">
          <FiArrowLeft />
        </button>
        <button type="button" onClick={() => scrollByCard(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-950 hover:text-slate-950" aria-label="Next products" title="Next products">
          <FiArrowRight />
        </button>
      </div>
      <div
        ref={trackRef}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        className={`product-carousel-scroll flex snap-x gap-6 overflow-x-auto pb-5 ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
      >
        {products.map((project) => {
          const id = project._id || project.id;
          const image = assetUrl(project.imageUrl || project.img);
          const description = project.shortDescription || project.description || project.desc || '';

          return (
            <article key={id} className="gradient-card group min-w-[calc(100vw-4rem)] max-w-[calc(100vw-4rem)] snap-start overflow-hidden rounded-[8px] shadow-sm transition hover:-translate-y-1 hover:shadow-2xl sm:min-w-[21rem] sm:max-w-[21rem]">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={image} alt={project.title} draggable="false" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  {project.productCode && (
                    <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-bold text-white">
                      ID {project.productCode}
                    </span>
                  )}
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{project.category || 'Printers'}</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-950">{project.title}</h3>
                <p className="mb-5 line-clamp-2 text-sm leading-6 text-slate-500">{description}</p>
                <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <span className="text-2xl font-bold text-slate-950">{formatCurrency(project.price)}</span>
                  <Link to={`/product/${id}`} className="gradient-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-bold text-white">
                    Details
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default ProductCarousel;
