"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

type OrderItem = { name: string; quantity: number };
type Order = {
  id: string;
  number: number;
  type: "PICKUP" | "DELIVERY";
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
  customerName: string;
  total: number; // cents
  createdAt: string;
  items: OrderItem[];
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPage() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<Record<string, Order["status"]>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async (): Promise<Order[]> =>
      api.get("api/admin/demo-deli/orders?limit=50").json(),
    refetchInterval: 5000, // auto-refresh every 5s
  });

  const updateStatus = useMutation({
    mutationFn: async (p: { id: string; status: Order["status"] }) =>
      api.post(`api/admin/orders/${p.id}/status`, { json: { status: p.status } }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });

  if (isLoading) return <main className="mx-auto max-w-6xl px-4 py-10">Loading…</main>;
  if (error) return <main className="mx-auto max-w-6xl px-4 py-10">Failed to load orders.</main>;

  const orders = data || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["adminOrders"] })}
          className="rounded-lg border px-3 py-1 text-sm hover:bg-black hover:text-white transition"
        >
          Refresh
        </button>
      </header>

      {orders.length === 0 ? (
        <p className="text-sm text-slate-600">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white/80 backdrop-blur">
          <table className="min-w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const value = sel[o.id] ?? o.status;
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-semibold">{o.number}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(o.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">{o.customerName}</td>
                    <td className="px-4 py-3">{o.type}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {o.items.map((it) => `${it.name} × ${it.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmtMoney(o.total)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                        title={o.status}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={value}
                          onChange={(e) =>
                            setSel((prev) => ({ ...prev, [o.id]: e.target.value as Order["status"] }))
                          }
                          className="rounded-md border px-2 py-1"
                        >
                          {[
                            "PENDING",
                            "CONFIRMED",
                            "PREPARING",
                            "READY",
                            "OUT_FOR_DELIVERY",
                            "COMPLETED",
                            "CANCELED",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            updateStatus.mutate({ id: o.id, status: (sel[o.id] ?? o.status) })
                          }
                          className="rounded-md bg-black px-3 py-1 text-white"
                          disabled={updateStatus.isPending}
                        >
                          {updateStatus.isPending ? "Saving…" : "Update"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
