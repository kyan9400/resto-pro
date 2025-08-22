"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type CartItem = {
  itemId: string;
  name: string;
  unitPrice: number; // cents
  quantity: number;
  options: { name: string; priceDelta: number }[];
};

type CartCtx = {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (idx: number) => void;
  clear: () => void;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum +
          (i.unitPrice + i.options.reduce((s, o) => s + (o.priceDelta || 0), 0)) *
            i.quantity,
        0
      ),
    [items]
  );

  const add = (i: CartItem) => setItems((prev) => [...prev, i]);
  const remove = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const clear = () => setItems([]);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, subtotal }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
};
