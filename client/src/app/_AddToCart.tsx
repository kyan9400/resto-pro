"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export default function AddToCart({ item }: { item: any }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<Record<string, any[]>>({}); // groupId -> options[]

  const totalDelta = Object.values(chosen)
    .flat()
    .reduce((s: number, o: any) => s + (o.priceDelta || 0), 0);

  const total = (item.price + totalDelta) * qty;

  return (
    <div className="mt-4 space-y-3">
      {item.optionGroups?.map((g: any) => (
        <div key={g.id} className="text-sm">
          <div className="font-medium text-slate-800">{g.name}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {g.options.map((opt: any) => {
              const selected = (chosen[g.id] || []).some((o: any) => o.id === opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setChosen((prev) => {
                      const cur = prev[g.id] || [];
                      const next = selected
                        ? cur.filter((o: any) => o.id !== opt.id)
                        : (g.maxSelect === 1 ? [opt] : [...cur, opt]).slice(0, g.maxSelect);
                      return { ...prev, [g.id]: next };
                    });
                  }}
                  className={`rounded-full border px-3 py-1 transition ${
                    selected
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {opt.name}
                  {opt.priceDelta ? ` (+${(opt.priceDelta / 100).toFixed(2)})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            const options = Object.values(chosen)
              .flat()
              .map((o: any) => ({ id: o.id, name: o.name, priceDelta: o.priceDelta || 0 }));
            add({
              itemId: item.id,
              name: item.name,
              unitPrice: item.price,
              quantity: qty,
              options,
            });
          }}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-white text-sm font-semibold shadow hover:opacity-95 active:scale-[0.99] transition"
        >
          Add • ${(total / 100).toFixed(2)}
        </button>
      </div>
    </div>
  );
}
