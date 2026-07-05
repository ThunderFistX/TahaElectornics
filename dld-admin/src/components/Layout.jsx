import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiFolder, FiShoppingCart, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX, FiMessageSquare } from 'react-icons/fi';
import Modal from './Modal';
import Toast from './Toast';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../lib/catalog';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@dld.com',
    phone: '',
    bio: '',
    profilePic: '',
  });
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('dld_profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfilePicUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, profilePic: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('dld_profile', JSON.stringify(profile));
    setIsProfileOpen(false);
    setToast('Profile saved successfully');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive ? 'bg-primary text-white shadow-card' : 'text-gray-300 hover:bg-dark-hover hover:text-white'
    }`;

  return (
   <div className="flex h-screen bg-light dark:bg-gray-900 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - <aside> semantic element */}
      <aside className={`fixed lg:static w-64 h-full bg-dark text-white flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {BRAND_NAME}
          </h1>
        </div>
        
        <nav className="flex-1 p-4 sidebar-scroll overflow-y-auto">
          <ul className="space-y-2">
            <li><NavLink to="/admin" end className={linkClass} onClick={() => setSidebarOpen(false)}><FiHome /> Dashboard</NavLink></li>
            <li><NavLink to="/admin/projects" className={linkClass} onClick={() => setSidebarOpen(false)}><FiFolder /> Projects</NavLink></li>
            <li><NavLink to="/admin/users" className={linkClass} onClick={() => setSidebarOpen(false)}><FiUsers /> Users</NavLink></li>
            <li><NavLink to="/admin/orders" className={linkClass} onClick={() => setSidebarOpen(false)}><FiShoppingCart /> Orders</NavLink></li>
            <li><NavLink to="/admin/messages" className={linkClass} onClick={() => setSidebarOpen(false)}><FiMessageSquare /> Messages</NavLink></li>
            <li><NavLink to="/admin/reports" className={linkClass} onClick={() => setSidebarOpen(false)}><FiBarChart2 /> Reports</NavLink></li>
            <li><NavLink to="/admin/settings" className={linkClass} onClick={() => setSidebarOpen(false)}><FiSettings /> Settings</NavLink></li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-red-500 hover:text-white transition-all">
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar - <header> semantic element */}
       <header className="bg-white dark:bg-gray-800 p-4 shadow-card flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
          <button className="lg:hidden text-2xl" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full"></span>
              <FiShoppingCart className="text-xl text-gray-600 cursor-pointer" />
            </div>
            {/* Avatar component */}
            <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary">
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (user?.name || profile.name).charAt(0)
              )}
            </button>
          </div>
        </header>

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Edit Profile">
          <form onSubmit={handleSaveProfile}>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                {profile.profilePic ? (
                  <img src={profile.profilePic} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition">
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleProfilePicUpload(e.target.files?.[0])}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsProfileOpen(false)} className="px-4 py-2 rounded-lg border-2 border-gray-200 hover:bg-gray-50 text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark text-sm font-semibold">
                Save Profile
              </button>
            </div>
          </form>
        </Modal>

        {/* Page Content - <main> semantic element */}
        <main className="flex-1 overflow-y-auto main-content-scroll p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
