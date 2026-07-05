import { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiCreditCard, FiShoppingCart, FiClock } from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/currency';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = () => {
  const { request } = useAuth();
  const [summary, setSummary] = useState({ totalUsers: 0, totalOrders: 0, totalRevenue: 0, pendingOrders: 0, cancelledOrders: 0, confirmedOrders: 0, orders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await request('/admin/summary');
        setSummary(data);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [request]);

  const monthlyData = useMemo(() => {
    const monthMap = {};
    summary.orders
      ?.filter((order) => order.orderStatus === 'Confirmed' && (order.paymentStatus === 'Paid' || order.paymentInfo?.provider === 'cash_on_delivery'))
      .forEach((order) => {
        const month = new Date(order.createdAt).getMonth();
        monthMap[month] = monthMap[month] || { revenue: 0, orders: 0 };
        monthMap[month].revenue += order.totalAmount || 0;
        monthMap[month].orders += 1;
      });

    return monthNames.map((name, index) => ({
      name,
      sales: monthMap[index]?.revenue ?? 0,
      orders: monthMap[index]?.orders ?? 0
    }));
  }, [summary.orders]);

  const stats = [
    { title: 'Total Revenue', value: formatCurrency(summary.totalRevenue), icon: <FiCreditCard />, color: 'bg-green-500' },
    { title: 'Total Users', value: summary.totalUsers, icon: <FiUsers />, color: 'bg-primary' },
    { title: 'Total Orders', value: summary.totalOrders, icon: <FiShoppingCart />, color: 'bg-secondary' },
    { title: 'Pending Orders', value: summary.pendingOrders, icon: <FiClock />, color: 'bg-yellow-500' }
  ];

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-bold text-dark mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white p-4 md:p-6 rounded-xl shadow-card hover:shadow-card-hover transition flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className={`${stat.color} p-3 md:p-4 rounded-lg text-white text-lg md:text-2xl flex-shrink-0`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-xs md:text-sm">{stat.title}</p>
              <h3 className="text-xl md:text-2xl font-bold text-dark truncate">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-card overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Confirmed Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-card overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Confirmed Orders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#ec4899" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-card overflow-hidden">
        <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-left text-sm md:text-base">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-3 px-3 md:px-4">Tracking ID</th>
                <th className="py-3 px-3 md:px-4">Customer</th>
                <th className="py-3 px-3 md:px-4">Amount</th>
                <th className="py-3 px-3 md:px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.orders?.slice(0, 8).map((order) => (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-3 md:px-4 font-medium">#{order.trackingId || order._id}</td>
                  <td className="py-3 px-3 md:px-4 truncate">{order.user?.name || order.guestDetails?.name || 'Customer'}</td>
                  <td className="py-3 px-3 md:px-4">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-3 px-3 md:px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      order.orderStatus === 'Confirmed' ? 'bg-green-100 text-green-600'
                        : order.orderStatus === 'Pending' ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {order.orderStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
