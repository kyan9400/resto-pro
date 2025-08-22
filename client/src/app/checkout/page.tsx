"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { api } from "@/lib/api";

type OrderResponse = {
  id: string;
  number: number;
  total: number;
  subtotal: number;
  tax: number;
  currency: string;
  status: string;
};

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const missingOptionIds = items.some((it) => (it.options || []).some((o) => !o.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResp(null);
    if (items.length === 0) {
      setError("Cart is empty.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        restaurantSlug: "demo-deli",
        type,
        customerName,
        phone: phone || undefined,
        email: email || undefined,
        items: items.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          options: (it.options || [])
            .filter((o) => o.id)
            .map((o) => ({ id: o.id as string })),
        })),
      };

      const data = await api.post("api/orders", { json: payload }).json<OrderResponse>();
      setResp(data);
      clear();
    } catch (err: any) {
      console.error(err);
      setError("Failed to place order. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {missingOptionIds && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Heads up: some items were added before option IDs were stored. If placing the order fails,
          please remove and re-add those items, then try again.
        </div>
      )}

      <section className="rounded-2xl border bg-white/80 p-5 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Items</div>
          <div className="text-sm font-semibold">${(subtotal/100).toFixed(2)}</div>
        </div>
        <ul className="text-sm text-slate-700 list-disc pl-6">
          {items.map((it, i) => (
            <li key={i}>
              {it.name} × {it.quantity}
              {it.options.length > 0 && <> — <span className="text-slate-500">{it.options.map(o => o.name).join(", ")}</span></>}
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm">Name</span>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>

        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="type" value="PICKUP" checked={type === "PICKUP"} onChange={() => setType("PICKUP")} />
            <span className="text-sm">Pickup</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="type" value="DELIVERY" checked={type === "DELIVERY"} onChange={() => setType("DELIVERY")} />
            <span className="text-sm">Delivery</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white font-semibold shadow hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Placing order..." : "Place order"}
        </button>
      </form>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {resp && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-lg font-semibold">✅ Order placed</div>
          <div className="mt-1 text-sm text-slate-700">Order # {resp.number} — Total ${(resp.total/100).toFixed(2)} {resp.currency}</div>
          <div className="mt-1 text-sm text-slate-600">Status: {resp.status}</div>
        </div>
      )}
    </main>
  );
}
