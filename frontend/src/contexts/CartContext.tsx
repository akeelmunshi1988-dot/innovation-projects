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

const sameDimension = (a: number, b: number) => Math.abs(a - b) < 0.000001;
const normalizedNotes = (notes?: string) => (notes ?? '').trim().replace(/\s+/g, ' ');

/** Charge-related choices (currently rush) do not create a separate cart line. */
function isSameConfiguration(a: Omit<CartItem, 'id'>, b: Omit<CartItem, 'id'>): boolean {
  return (
    a.rug_id === b.rug_id &&
    sameDimension(a.size_w, b.size_w) &&
    sameDimension(a.size_h, b.size_h) &&
    (a.shape || 'rect').toLowerCase() === (b.shape || 'rect').toLowerCase() &&
    normalizedNotes(a.notes) === normalizedNotes(b.notes)
  );
}

function consolidateCart(items: CartItem[]): CartItem[] {
  return items.reduce<CartItem[]>((merged, item) => {
    const existingIndex = merged.findIndex((existing) => isSameConfiguration(existing, item));
    if (existingIndex === -1) return [...merged, item];

    const next = [...merged];
    next[existingIndex] = {
      ...next[existingIndex],
      qty: next[existingIndex].qty + item.qty,
      // One configuration has one set of charge options; the latest choice wins.
      rush_order: item.rush_order,
      notes: item.notes,
    };
    return next;
  }, []);
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? consolidateCart(JSON.parse(raw)) : [];
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
      // Same rug configuration → one line item, regardless of charge changes.
      const dupeIndex = prev.findIndex((existing) => isSameConfiguration(existing, item));
      if (dupeIndex !== -1) {
        const next = [...prev];
        next[dupeIndex] = {
          ...next[dupeIndex],
          qty: next[dupeIndex].qty + item.qty,
          rush_order: item.rush_order,
          notes: item.notes,
        };
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
    setItems((prev) => consolidateCart(prev.map((i) => (i.id === id ? { ...i, ...patch } : i))));
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
