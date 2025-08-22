import { Router } from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { z } from "zod";
import { addClient, publish } from "../sse";

const r = Router();
const db = new PrismaClient();

/**
 * SSE stream of order updates for a restaurant
 */
r.get("/:slug/stream", (req, res) => {
  const slug = req.params.slug;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // CORS pre-set by app.use(cors(...)), but make extra permissive just in case
  const origin = req.headers.origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);

  res.flushHeaders?.(); // if compression disabled

  addClient(slug, res);

  // Heartbeat
  const iv = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 15000);
  req.on("close", () => clearInterval(iv));
});

/**
 * GET /api/admin/:slug/orders?limit=50
 * List recent orders for a restaurant
 */
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

/**
 * POST /api/admin/orders/:id/status
 * Body: { status: OrderStatus, note?: string }
 * Update order status and append a status event
 */
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

    // Broadcast status change
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

export default r;
