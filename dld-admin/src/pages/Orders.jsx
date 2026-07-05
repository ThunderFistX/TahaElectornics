import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/currency';

const Orders = () => {
  const { request } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/orders');
      setOrders(data.orders || []);
    } catch (err) {
      setMessage(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = filter === 'All' ? orders : orders.filter((order) => order.orderStatus === filter);

  const updateStatus = async (id, status) => {
    try {
      const data = await request(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setOrders((prev) => prev.map((order) => (order._id === id ? data.order : order)));
      setMessage(`Order ${status.toLowerCase()} successfully`);
    } catch (err) {
      setMessage(err.message || 'Failed to update order');
    }
  };

  const updateRefund = async (id, status) => {
    try {
      const data = await request(`/orders/${id}/refund`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setOrders((prev) => prev.map((order) => (order._id === id ? data.order : order)));
      setMessage(`Refund marked ${status.toLowerCase()}`);
    } catch (err) {
      setMessage(err.message || 'Failed to update refund');
    }
  };

  const updateChangeRequest = async (id, status) => {
    try {
      const data = await request(`/orders/${id}/change-request`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setOrders((prev) => prev.map((order) => (order._id === id ? data.order : order)));
      setMessage(`Product change request ${status.toLowerCase()}`);
    } catch (err) {
      setMessage(err.message || 'Failed to update product change request');
    }
  };

  const tabs = ['All', 'Pending', 'Confirmed', 'Cancelled'];

  return (
    <section className="w-full">
      <h2 className="text-xl md:text-2xl font-bold text-dark mb-6">Order Management</h2>

      {message && <div className="mb-4 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg text-sm font-semibold">{message}</div>}

      <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-card w-full overflow-x-auto table-scroll">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 md:px-4 py-2 rounded-md transition font-semibold text-sm md:text-base whitespace-nowrap ${filter === tab ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading orders...</div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const customerName = order.user?.name || order.guestDetails?.name || 'Customer';
            const projectName = order.items?.map((item) => item.title).join(', ') || 'Project';
            const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';

            return (
              <div key={order._id} className="bg-white p-4 md:p-6 rounded-xl shadow-card hover:shadow-card-hover transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-bold text-dark text-base md:text-lg">#{order.trackingId || order._id}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      order.orderStatus === 'Confirmed' ? 'bg-green-100 text-green-600'
                        : order.orderStatus === 'Pending' ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm"><span className="font-semibold text-dark">{customerName}</span> ordered <span className="font-semibold text-dark">{projectName}</span></p>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">Date: {orderDate} | Amount: <span className="text-primary font-bold">{formatCurrency(order.totalAmount)}</span></p>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">
                    Payment: <span className="font-semibold text-dark">{order.paymentStatus}</span>
                    <span> | Method: </span>
                    <span className="font-semibold text-dark">{order.paymentInfo?.provider === 'cash_on_delivery' ? 'Cash on Delivery' : (order.paymentInfo?.provider || 'Card')}</span>
                  </p>
                  {order.refundRequest?.requested && (
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                      Refund: <span className="font-semibold text-dark">{order.refundRequest.status || 'Requested'}</span>
                      {order.refundRequest.account ? ` | Account: ${order.refundRequest.account}` : ''}
                    </p>
                  )}
                  {order.changeRequest?.requested && (
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                      Product change: <span className="font-semibold text-dark">{order.changeRequest.status || 'Requested'}</span>
                      {order.changeRequest.details ? ` | ${order.changeRequest.details}` : ''}
                    </p>
                  )}
                </div>

                {(order.orderStatus === 'Pending' || order.refundRequest?.requested || order.changeRequest?.requested) && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {order.orderStatus === 'Pending' && (
                      <>
                        <button onClick={() => updateStatus(order._id, 'Confirmed')} className="bg-green-500 hover:bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Confirm</button>
                        <button onClick={() => updateStatus(order._id, 'Cancelled')} className="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Cancel</button>
                      </>
                    )}
                    {order.refundRequest?.status === 'Requested' && (
                      <>
                        <button onClick={() => updateRefund(order._id, 'Approved')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Approve Refund</button>
                        <button onClick={() => updateRefund(order._id, 'Rejected')} className="bg-slate-500 hover:bg-slate-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Reject Refund</button>
                      </>
                    )}
                    {order.refundRequest?.status === 'Approved' && (
                      <button onClick={() => updateRefund(order._id, 'Refunded')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Mark Refunded</button>
                    )}
                    {order.changeRequest?.status === 'Requested' && (
                      <>
                        <button onClick={() => updateChangeRequest(order._id, 'Approved')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Approve Change</button>
                        <button onClick={() => updateChangeRequest(order._id, 'Rejected')} className="bg-slate-500 hover:bg-slate-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none font-semibold">Reject Change</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400">No orders found for this filter.</div>
          )}
        </div>
      )}
    </section>
  );
};

export default Orders;
