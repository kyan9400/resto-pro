"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";

type OrderItem = { name: string; quantity: number };
type Order = {
  id: string;
  number: number;
  type: "PICKUP" | "DELIVERY";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "CANCELED";
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
  const esRef = useRef<EventSource | null>(null);

  // Sound setup
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  function enableSound() {
    if (!audioCtxRef.current) {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    setSoundEnabled(true);
  }
  function ding() {
    const ctx = audioCtxRef.current;
    if (!soundEnabled || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.stop(now + 0.2);
  }

  // Highlight new orders
  const [justArrived, setJustArrived] = useState<Set<string>>(new Set());
  function markJustArrived(id: string) {
    setJustArrived((prev) => {
      const next = new Set(prev);
      next.add(id);
      setTimeout(() => {
        setJustArrived((p2) => {
          const n2 = new Set(p2);
          n2.delete(id);
          return n2;
        });
      }, 6000);
      return next;
    });
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async (): Promise<Order[]> =>
      api.get("api/admin/demo-deli/orders?limit=50").json(),
    refetchInterval: 15000, // fallback
  });

  // Realtime via SSE with optional token
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const url = `${base}/api/admin/demo-deli/stream`;
    const t = getAdminToken();
    const es = new EventSource(t ? `${url}?token=${encodeURIComponent(t)}` : url, {
      withCredentials: false,
    });
    esRef.current = es;

    const onCreated = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.id) {
          markJustArrived(payload.id);
          ding();
        }
      } catch {}
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
    };
    const onUpdated = () => qc.invalidateQueries({ queryKey: ["adminOrders"] });

    es.addEventListener("order.created", onCreated);
    es.addEventListener("order.updated", onUpdated);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [qc, soundEnabled]);

  const updateStatus = useMutation({
    mutationFn: async (p: { id: string; status: Order["status"] }) =>
      api.post(`api/admin/orders/${p.id}/status`, { json: { status: p.status } }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });

  if (isLoading) return <main className="mx-auto max-w-6xl px-4 py-10">Loading…</main>;
  if (error) return <main className="mx-auto max-w-6xl px-4 py-10">Failed to load orders.</main>;

  const orders = data || [];
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Realtime</span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["adminOrders"] })}
            className="ml-3 rounded-lg border px-3 py-1 text-sm hover:bg-black hover:text-white transition"
          >
            Refresh
          </button>
          <button
            onClick={enableSound}
            className={`ml-2 rounded-lg border px-3 py-1 text-sm transition ${
              soundEnabled ? "bg-emerald-600 text-white border-emerald-600" : "hover:bg-black hover:text-white"
            }`}
            title={soundEnabled ? "Sound enabled" : "Click to enable sound"}
          >
            {soundEnabled ? "🔔 Sound on" : "Enable sound"}
          </button>
          <a
            href="/admin/login"
            className="ml-2 rounded-lg border px-3 py-1 text-sm hover:bg-black hover:text-white transition"
          >
            Go to login
          </a>
          <button
            onClick={() => {
              clearAdminToken();
              location.reload();
            }}
            className="ml-2 rounded-lg border px-3 py-1 text-sm hover:bg-black hover:text-white transition"
          >
            Log out
          </button>
        </div>
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
                <th className="px-4 py-3">Print</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const value = sel[o.id] ?? o.status;
                const isNew = justArrived.has(o.id);
                return (
                  <tr key={o.id} className={`border-b last:border-0 ${isNew ? "bg-amber-50 animate-pulse" : ""}`}>
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
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const t = getAdminToken();
                          const href = t
                            ? `${base}/api/admin/orders/${o.id}/ticket?token=${encodeURIComponent(t)}`
                            : `${base}/api/admin/orders/${o.id}/ticket`;
                          window.open(href, "_blank");
                        }}
                        className="rounded-md border px-3 py-1 hover:bg-black hover:text-white transition"
                      >
                        Print
                      </button>
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
