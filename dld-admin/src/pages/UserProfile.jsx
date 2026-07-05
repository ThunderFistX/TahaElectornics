import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/currency';

const UserProfile = () => {
  const { user, isLoggedIn, request } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [refundAccounts, setRefundAccounts] = useState({});
  const [changeDetails, setChangeDetails] = useState({});
  const [now] = useState(() => Date.now());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/orders/me');
      setOrders(data.orders || []);
    } catch (err) {
      setMessage(err.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isLoggedIn) loadOrders();
  }, [isLoggedIn, loadOrders]);

  if (!isLoggedIn) return <Navigate to="/auth" replace />;

  const canRequestRefund = (order) => {
    if (order.orderStatus !== 'Pending' || order.paymentStatus !== 'Paid') return false;
    return now - new Date(order.createdAt).getTime() <= 24 * 60 * 60 * 1000;
  };

  const cancelOrder = async (orderId) => {
    try {
      const data = await request(`/orders/${orderId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          account: refundAccounts[orderId] || '',
          reason: 'Customer cancelled order'
        })
      });
      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
      setMessage(data.order.paymentStatus === 'Refund Requested'
        ? 'Order cancelled. Refund request saved with your account details.'
        : 'Order cancelled.');
    } catch (err) {
      setMessage(err.message || 'Unable to cancel order');
    }
  };

  const requestChange = async (orderId) => {
    try {
      const data = await request(`/orders/${orderId}/change-request`, {
        method: 'POST',
        body: JSON.stringify({ details: changeDetails[orderId] || '' })
      });
      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
      setMessage('Product change request sent to admin.');
    } catch (err) {
      setMessage(err.message || 'Unable to request product change');
    }
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">{user?.name} - {user?.email}</p>
      </div>

      {message && <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg text-sm font-semibold">{message}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">My Orders & Tracking</h2>
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Browse more projects</Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 mb-4">No orders yet.</p>
          <Link to="/" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h3 className="font-black text-slate-900">Tracking ID: {order.trackingId}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Status: <span className="font-semibold text-slate-900">{order.orderStatus}</span> - Payment: <span className="font-semibold text-slate-900">{order.paymentStatus}</span>
                  </p>
                  {order.refundRequest?.requested && (
                    <p className="text-sm text-slate-500 mt-1">
                      Refund: <span className="font-semibold text-slate-900">{order.refundRequest.status || 'Requested'}</span>
                    </p>
                  )}
                  {order.changeRequest?.requested && (
                    <p className="text-sm text-slate-500 mt-1">
                      Product change: <span className="font-semibold text-slate-900">{order.changeRequest.status || 'Requested'}</span>
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    Total: <span className="font-bold text-indigo-600">{formatCurrency(order.totalAmount)}</span>
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                {order.orderStatus === 'Pending' && (
                  <div className="w-full md:w-80 space-y-2">
                    {canRequestRefund(order) && (
                      <input
                        value={refundAccounts[order._id] || ''}
                        onChange={(e) => setRefundAccounts((prev) => ({ ...prev, [order._id]: e.target.value }))}
                        placeholder="Refund account details"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      />
                    )}
                    <button
                      onClick={() => cancelOrder(order._id)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                    >
                      {canRequestRefund(order) ? 'Cancel & Request Refund' : 'Cancel Order'}
                    </button>
                  </div>
                )}
                {order.orderStatus === 'Confirmed' && (
                  <div className="w-full md:w-80 space-y-2">
                    <textarea
                      value={changeDetails[order._id] || ''}
                      onChange={(e) => setChangeDetails((prev) => ({ ...prev, [order._id]: e.target.value }))}
                      placeholder="Describe the product change you want"
                      disabled={order.changeRequest?.status === 'Requested'}
                      rows="3"
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                    />
                    <button
                      onClick={() => requestChange(order._id)}
                      disabled={order.changeRequest?.status === 'Requested'}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-60"
                    >
                      {order.changeRequest?.status === 'Requested' ? 'Change Request Sent' : 'Request Product Change'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
                {order.items?.map((item) => (
                  <div key={`${order._id}-${item.product || item.title}`} className="flex justify-between gap-4 py-1">
                    <span>{item.title} x {item.quantity}</span>
                    <span className="font-semibold">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default UserProfile;
