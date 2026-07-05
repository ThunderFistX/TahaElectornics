import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../lib/api';
import { formatCurrency } from '../lib/currency';

const CartPage = () => {
  const { cart, removeItem, cartTotal, clearCart } = useCart();
  const { isLoggedIn, request, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({ phone: '', address: '', postalCode: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  useEffect(() => {
    setDeliveryDetails({
      phone: user?.phone || '',
      address: user?.deliveryAddress?.address || '',
      postalCode: user?.deliveryAddress?.postalCode || ''
    });
  }, [user]);

  const handleDeliveryChange = (field, value) => {
    setDeliveryDetails((prev) => ({ ...prev, [field]: value }));
  };

  const deliveryComplete = deliveryDetails.phone.trim()
    && deliveryDetails.address.trim()
    && deliveryDetails.postalCode.trim();

  const checkout = async () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }

    setCheckingOut(true);
    setCheckoutError('');

    try {
      if (!deliveryComplete) {
        setCheckoutError('Please add your delivery address, phone number, and postal code.');
        setCheckingOut(false);
        return;
      }

      await request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({
            product: item._id,
            title: item.title,
            description: item.description || item.desc || '',
            price: item.price,
            quantity: item.quantity
          })),
          deliveryDetails,
          paymentInfo: { method: paymentMethod, details: { type: paymentMethod } }
        })
      });
      updateUser({
        ...user,
        phone: deliveryDetails.phone.trim(),
        deliveryAddress: {
          address: deliveryDetails.address.trim(),
          postalCode: deliveryDetails.postalCode.trim()
        }
      });
      clearCart();
      navigate('/profile');
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <FiShoppingBag className="mx-auto text-5xl text-slate-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Your cart is empty</h2>
        <p className="text-slate-500 mb-8">Looks like you haven't added any projects yet.</p>
        <Link to="/" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
          Browse Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-slate-900">Shopping Cart ({cart.length})</h1>
          <button onClick={clearCart} className="text-sm text-red-500 font-semibold hover:underline">Clear All</button>
        </div>
        
        {cart.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100">
            <img src={assetUrl(item.imageUrl || item.img || '/1.webp')} alt={item.title} className="w-20 h-20 object-cover rounded-xl" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{item.title}</h3>
              <p className="text-indigo-600 font-black">{formatCurrency(item.price)} <span className="text-slate-400 font-medium text-xs">x {item.quantity}</span></p>
            </div>
            <button 
              onClick={() => removeItem(item.id)}
              className="p-2 text-slate-300 hover:text-red-500 transition"
            >
              <FiTrash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 h-fit sticky top-24">
        <h2 className="text-xl font-bold mb-6">Order Summary</h2>
        {isLoggedIn && (
          <div className="mb-6 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={deliveryDetails.phone}
                onChange={(e) => handleDeliveryChange('phone', e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Address</label>
              <textarea
                value={deliveryDetails.address}
                onChange={(e) => handleDeliveryChange('address', e.target.value)}
                placeholder="Street, city, country"
                rows="3"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Postal Code</label>
              <input
                value={deliveryDetails.postalCode}
                onChange={(e) => handleDeliveryChange('postalCode', e.target.value)}
                placeholder="Postal code"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <p className="font-bold text-slate-900">Payment Method</p>
            <label className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 cursor-pointer">
              <input
                type="radio"
                checked={paymentMethod === 'cash_on_delivery'}
                onChange={() => setPaymentMethod('cash_on_delivery')}
                className="accent-emerald-600"
              />
              <span>
                <span className="block font-bold text-slate-900">Cash on Delivery</span>
                <span className="block text-xs text-slate-500">Pay when your order is delivered.</span>
              </span>
            </label>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Processing Fee</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-900">Total</span>
            <span className="text-2xl font-black text-indigo-600">{formatCurrency(cartTotal)}</span>
          </div>
        </div>
        
        {checkoutError && <p className="text-red-500 text-sm font-semibold mb-4">{checkoutError}</p>}
        <button
          onClick={checkout}
          disabled={checkingOut}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition mb-4 disabled:opacity-60"
        >
          {checkingOut ? 'Placing order...' : isLoggedIn ? 'Place COD Order' : 'Login to Checkout'}
        </button>
        <div className="text-center text-xs font-semibold text-slate-400">
            Cash on delivery is available for all orders.
        </div>
      </div>
    </div>
  );
};

export default CartPage;
