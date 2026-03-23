import React, { createContext, useContext, useMemo, useState } from 'react';

const CART_STORAGE_KEY = 'qr_cart_items_v1';

const CartContext = createContext(null);

function readInitialCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [cart, setCartState] = useState(readInitialCart);

  const setCart = (nextCart) => {
    const normalized = Array.isArray(nextCart) ? nextCart : [];
    setCartState(normalized);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    } catch (_) {
      // ignore storage write errors
    }
  };

  const addToCart = (product) => {
    setCartState((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const next = existing
        ? prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...prev, { ...product, quantity: 1 }];
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const removeFromCart = (productId) => {
    setCartState((prev) => {
      const next = prev.filter((item) => item.id !== productId);
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartState((prev) => {
      const next = prev.map((item) => (item.id === productId ? { ...item, quantity } : item));
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const clearCart = () => setCart([]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [cart]);

  const value = {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
};
