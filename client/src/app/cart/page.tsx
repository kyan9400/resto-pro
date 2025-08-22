"use client";
import { useCart } from "@/components/cart-provider";

export default function CartPage() {
  const { items, remove, clear, subtotal } = useCart();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Your Cart</h1>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Cart is empty.</p>
      ) : (
        <>
          <ul className="divide-y rounded-2xl border">
            {items.map((it, idx) => (
              <li key={idx} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{it.name} × {it.quantity}</div>
                  {it.options.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {it.options.map((o) => o.name).join(", ")}
                    </div>
                  )}
                  <div className="text-sm">${(it.unitPrice/100).toFixed(2)} each</div>
                </div>
                <button
                  onClick={() => remove(idx)}
                  className="text-sm rounded border px-3 py-1 hover:bg-black hover:text-white transition"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <button onClick={clear} className="text-sm underline">Clear cart</button>
            <div className="text-lg font-semibold">Subtotal: ${(subtotal/100).toFixed(2)}</div>
          </div>

          <button
            className="w-full rounded-xl bg-black px-4 py-3 text-white font-medium"
            disabled
            title="Checkout coming next"
          >
            Checkout (coming next)
          </button>
        </>
      )}
    </main>
  );
}
