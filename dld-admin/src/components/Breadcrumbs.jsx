import { Link } from 'react-router-dom';

const Breadcrumbs = ({ items = [] }) => {
  return (
    <nav className="text-sm font-semibold text-slate-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span className="text-slate-300">&gt;</span>}
              {isLast || !item.to ? (
                <span className="font-black text-slate-950">{item.label}</span>
              ) : (
                <Link to={item.to} className="hover:text-emerald-700">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
