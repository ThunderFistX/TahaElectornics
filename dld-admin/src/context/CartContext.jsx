import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dld_cart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('dld_cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (product) => {
    const id = product._id || product.id;
    setCart((prev) => {
      const existing = prev.find((item) => (item._id || item.id) === id);
      if (existing) {
        return prev.map((item) => ((item._id || item.id) === id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { ...product, id, quantity: 1 }];
    });
  };

  const removeItem = (id) => setCart((prev) => prev.filter((item) => (item._id || item.id) !== id));
  const clearCart = () => setCart([]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
