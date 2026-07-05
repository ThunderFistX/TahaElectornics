import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../lib/catalog';
import { FiShoppingBag, FiUser } from 'react-icons/fi';
import AnnouncementRibbon from '../components/AnnouncementRibbon';

const Navbar = () => {
  const { isLoggedIn, isAdmin, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/92 text-slate-950 shadow-sm backdrop-blur-xl">
      <AnnouncementRibbon />
      <nav className="border-b border-slate-100">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:h-20 md:py-0">
          <Link to="/" className="min-w-0 text-lg font-black tracking-wide text-slate-950 hover:text-cyan-700 sm:text-2xl">
            {BRAND_NAME}
          </Link>

          <div className="hidden items-center gap-9 text-sm font-bold uppercase tracking-wide text-slate-600 md:flex">
            <Link to="/" className="hover:text-slate-950">Home</Link>
            <Link to="/projects" className="hover:text-slate-950">Products</Link>
            <Link to="/accessories" className="hover:text-slate-950">Accessories</Link>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <Link to="/projects" className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-slate-950 hover:text-slate-950 sm:flex" aria-label="Shop products" title="Shop products">
              <FiShoppingBag />
            </Link>
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-bold text-slate-600 hover:text-slate-950">
                    Admin
                  </Link>
                )}
                <Link to="/profile" className="flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-slate-950 hover:text-slate-950">
                  <FiUser /> <span className="hidden sm:inline">{user?.name || 'Profile'}</span>
                </Link>
                <button onClick={logout} className="gradient-button rounded-full px-3 py-2 text-xs font-bold text-white sm:px-4 sm:text-sm">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="gradient-button rounded-full px-4 py-2.5 text-sm font-bold text-white sm:px-5">
                Login
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-100 bg-white/80 text-center text-xs font-bold uppercase tracking-wide text-slate-600 md:hidden">
          <Link to="/" className="px-2 py-3 hover:bg-cyan-50 hover:text-cyan-800">Home</Link>
          <Link to="/projects" className="px-2 py-3 hover:bg-cyan-50 hover:text-cyan-800">Products</Link>
          <Link to="/accessories" className="px-2 py-3 hover:bg-cyan-50 hover:text-cyan-800">Accessories</Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
