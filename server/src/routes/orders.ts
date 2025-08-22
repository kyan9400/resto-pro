import { Router } from "express";
import { PrismaClient, OrderStatus, PaymentStatus, OrderType } from "@prisma/client";
import { z } from "zod";

const r = Router();
const db = new PrismaClient();

const OrderInput = z.object({
  restaurantSlug: z.string(),
  type: z.enum(["PICKUP","DELIVERY"]),
  customerName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  address: z.any().optional(),
  items: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().min(1),
      options: z.array(z.object({ id: z.string() })).optional().default([])
    })
  ).min(1)
});

const TAX_RATE = Number(process.env.TAX_RATE ?? "0"); // e.g. set TAX_RATE=0.08 in .env for 8%

r.post("/", async (req, res) => {
  try {
    const input = OrderInput.parse(req.body);

    const restaurant = await db.restaurant.findUnique({ where: { slug: input.restaurantSlug }});
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    let subtotal = 0;
    const lineItems: any[] = [];

    for (const line of input.items) {
      const item = await db.menuItem.findUnique({
        where: { id: line.itemId },
        include: { optionGroups: { include: { options: true } } }
      });
      if (!item || item.restaurantId !== restaurant.id || !item.isAvailable) {
        return res.status(400).json({ error: "Invalid item in cart" });
      }

      // Map optionId -> priceDelta
      const optionMap = new Map<string, number>();
      for (const g of item.optionGroups) for (const o of g.options) optionMap.set(o.id, o.priceDelta);

      // Validate selected options belong to this item & sum deltas
      let delta = 0;
      for (const o of line.options ?? []) {
        const priceDelta = optionMap.get(o.id);
        if (priceDelta == null) return res.status(400).json({ error: "Invalid option selection" });
        delta += priceDelta;
      }

      const unitPrice = item.price;
      const lineTotal = (unitPrice + delta) * line.quantity;
      subtotal += lineTotal;

      lineItems.push({
        itemId: item.id,
        name: item.name,
        unitPrice,
        quantity: line.quantity,
        optionsJson: (line.options ?? []).map(o => ({ id: o.id }))
      });
    }

    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    const order = await db.order.create({
      data: {
        restaurantId: restaurant.id,
        type: input.type as OrderType,
        status: OrderStatus.PENDING,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        addressJson: input.address ?? null,
        subtotal,
        tax,
        total,
        paymentStatus: PaymentStatus.UNPAID,
        items: { create: lineItems },
        events: { create: { status: OrderStatus.PENDING, note: "Order placed" } }
      },
      include: { items: true }
    });

    return res.status(201).json({
      id: order.id,
      number: order.number,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      currency: restaurant.currency,
      status: order.status
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid payload", details: e.flatten() });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default r;
