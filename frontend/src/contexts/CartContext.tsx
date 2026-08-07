import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CartItem {
  id: string; // client-generated uuid — identifies the cart line, not the rug
  rug_id: number;
  rug_name: string;
  image_url: string | null;
  size_w: number;
  size_h: number;
  shape: string;
  qty: number;
  rush_order: boolean;
  notes?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<Omit<CartItem, 'id'>>) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'loomcraftrugs_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      // Same rug, same spec (size/shape/rush/notes) → same line item. Merge quantities
      // instead of adding a second row for what's really the same configuration.
      const dupeIndex = prev.findIndex((i) =>
        i.rug_id === item.rug_id &&
        i.size_w === item.size_w &&
        i.size_h === item.size_h &&
        i.shape === item.shape &&
        i.rush_order === item.rush_order &&
        (i.notes ?? '') === (item.notes ?? '')
      );
      if (dupeIndex !== -1) {
        const next = [...prev];
        next[dupeIndex] = { ...next[dupeIndex], qty: next[dupeIndex].qty + item.qty };
        return next;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return [...prev, { ...item, id }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<Omit<CartItem, 'id'>>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider value={{ items, itemCount: items.length, addItem, removeItem, updateItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
