import { useCallback, useEffect, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { request, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/users');
      setUsers(data.users || []);
    } catch (err) {
      setToast(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = async (userId) => {
    try {
      await request(`/users/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((item) => item._id !== userId));
      setToast('User removed successfully');
    } catch (err) {
      setToast(err.message || 'Unable to remove user');
    }
  };

  if (loading) return <div className="text-center py-8">Loading users...</div>;

  return (
    <section className="w-full">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-dark">Manage Users</h2>
          <p className="text-xs md:text-sm text-gray-500">Users are loaded from the database.</p>
        </div>
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:max-w-md px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredUsers.map((item) => (
          <div key={item._id} className="bg-white p-4 md:p-6 rounded-xl shadow-card hover:shadow-card-hover transition">
            <div className="flex items-center gap-3 md:gap-4 mb-4">
              {item.avatar ? (
                <img src={item.avatar} alt={item.name} className="w-10 md:w-12 h-10 md:h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold text-lg md:text-xl flex-shrink-0">
                  {(item.name || item.email || 'U').charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-bold text-dark text-sm md:text-base truncate">{item.name}</h4>
                <p className="text-xs md:text-sm text-gray-500 truncate">{item.email}</p>
                <p className="text-xs text-gray-400 truncate">{item.phone || 'No phone saved'}</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold ${
                item.role === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
              }`}>
                {item.role}
              </span>
              <button
                onClick={() => handleRemove(item._id)}
                disabled={item._id === currentUser?.id}
                className="text-red-500 disabled:text-gray-300 font-semibold text-xs md:text-sm hover:underline disabled:hover:no-underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-10 text-gray-400">No users found.</div>
      )}
    </section>
  );
};

export default Users;
