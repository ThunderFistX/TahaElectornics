import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/currency';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#8b5cf6', '#14b8a6'];

const Reports = () => {
  const { request } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await request('/admin/summary');
        setOrders(data.orders || []);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [request]);

  const monthlyRevenue = useMemo(() => {
    const monthMap = {};
    orders
      .filter((order) => order.orderStatus === 'Confirmed' && order.paymentStatus === 'Paid')
      .forEach((order) => {
      const date = new Date(order.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      monthMap[month] = (monthMap[month] || 0) + (order.totalAmount || 0);
    });
    return Object.entries(monthMap).map(([name, sales]) => ({ name, sales }));
  }, [orders]);

  const categoryData = useMemo(() => {
    const counts = orders.reduce((acc, order) => {
      order.items?.forEach((item) => {
        const category = item.product?.category || 'Other';
        acc[category] = (acc[category] || 0) + item.quantity;
      });
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  if (loading) return <div className="text-center py-8">Loading reports...</div>;

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-bold text-dark mb-6">Reports & Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue Growth Chart */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-card overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Revenue Growth</h3>
          <div className="overflow-x-auto table-scroll">
            <ResponsiveContainer width="100%" height={350} minWidth={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-card overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Project Categories</h3>
          <div className="overflow-x-auto table-scroll">
            <ResponsiveContainer width="100%" height={350} minWidth={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reports;
