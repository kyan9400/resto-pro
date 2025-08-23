import { Router } from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { z } from "zod";
import { addClient, publish } from "../sse";
import { requireAdmin } from "../middleware/adminAuth";

const r = Router();
const db = new PrismaClient();

// Protect admin endpoints only if ADMIN_TOKEN is set
r.use(requireAdmin);

/* ---------- SSE stream ---------- */
r.get("/:slug/stream", (req, res) => {
  const slug = req.params.slug;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const origin = req.headers.origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);

  // Flush headers (when compression is off)
  (res as any).flushHeaders?.();

  addClient(slug, res);

  const iv = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 15000);
  req.on("close", () => clearInterval(iv));
});

/* ---------- List recent orders ---------- */
r.get("/:slug/orders", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const slug = req.params.slug;
  try {
    const resto = await db.restaurant.findUnique({ where: { slug } });
    if (!resto) return res.status(404).json({ error: "Restaurant not found" });

    const orders = await db.order.findMany({
      where: { restaurantId: resto.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: true,
        events: { orderBy: { createdAt: "asc" } }
      }
    });

    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Update order status ---------- */
const StatusBody = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional()
});

r.post("/orders/:id/status", async (req, res) => {
  try {
    const { status, note } = StatusBody.parse(req.body);
    const order = await db.order.findUnique({
      where: { id: req.params.id },
      include: { restaurant: true }
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const updated = await db.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: { status }
      });
      await tx.statusEvent.create({
        data: { orderId: order.id, status, note: note ?? null }
      });
      return o;
    });

    publish(order.restaurant.slug, "order.updated", {
      id: updated.id,
      number: updated.number,
      status: updated.status
    });

    res.json({ id: updated.id, number: updated.number, status: updated.status });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid payload", details: e.flatten() });
    }
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Printable kitchen ticket (80mm) ---------- */
r.get("/orders/:id/ticket", async (req, res) => {
  try {
    const order = await db.order.findUnique({
      where: { id: req.params.id },
      include: { restaurant: true, items: true }
    });
    if (!order) return res.status(404).send("Order not found");

    // Build option name lookup for each item
    const itemLines: string[] = [];
    for (const it of order.items) {
      let optionNames: string[] = [];
      const optionIds = Array.isArray(it.optionsJson) ? (it.optionsJson as any[]).map(o => (o as any).id) : [];
      if (optionIds.length > 0) {
        const menuItem = await db.menuItem.findUnique({
          where: { id: it.itemId },
          include: { optionGroups: { include: { options: true } } }
        });
        if (menuItem) {
          const map = new Map<string, string>();
          for (const g of menuItem.optionGroups) for (const o of g.options) map.set(o.id, o.name);
          optionNames = optionIds.map(id => map.get(id) ?? id);
        }
      }
      const name = `${it.name} x${it.quantity}`;
      const opts = optionNames.length ? `\n  - ${optionNames.join(", ")}` : "";
      itemLines.push(`${name}${opts}`);
    }

    const fmt = (cents: number) => (cents / 100).toFixed(2);
    const created = new Date(order.createdAt).toLocaleString();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket #${order.number} - ${order.restaurant.name}</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    * { box-sizing: border-box; }
    body { font: 14px/1.25 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #000; }
    h1 { font-size: 18px; margin: 0 0 6px 0; }
    .muted { color: #555; }
    .row { display: flex; justify-content: space-between; }
    hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
    .totals div { display: flex; justify-content: space-between; margin-top: 4px; }
    .big { font-size: 18px; font-weight: 700; }
    .badge { border: 1px solid #000; padding: 2px 6px; border-radius: 9999px; font-size: 12px; }
    @media print { .noprint { display: none; } }
  </style>
</head>
<body>
  <div class="noprint" style="margin-bottom:8px;">
    <button onclick="window.print()">Print</button>
  </div>

  <h1>${order.restaurant.name}</h1>
  <div class="row"><div>Order #</div><div class="big">${order.number}</div></div>
  <div class="row"><div>When</div><div>${created}</div></div>
  <div class="row"><div>Name</div><div>${order.customerName}</div></div>
  <div class="row"><div>Type</div><div><span class="badge">${order.type.replace(/_/g," ")}</span></div></div>
  <div class="row"><div>Status</div><div>${order.status.replace(/_/g," ")}</div></div>

  <hr />

  <div>
    ${itemLines.map(l => `<div style="white-space:pre-wrap; margin:4px 0">${l}</div>`).join("")}
  </div>

  <hr />

  <div class="totals">
    <div><span>Subtotal</span><span>$${fmt(order.subtotal)}</span></div>
    <div><span>Tax</span><span>$${fmt(order.tax)}</span></div>
    <div class="big"><span>Total</span><span>$${fmt(order.total)}</span></div>
  </div>

  <hr />
  <div class="muted">Ticket ID: ${order.id}</div>
  <script>window.onload = () => { setTimeout(()=>window.print(), 150); };</script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

export default r;
