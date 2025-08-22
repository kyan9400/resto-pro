import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import ordersRouter from "./routes/orders";
import adminRouter from "./routes/admin";

const app = express();
const db = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);

// Allow multiple dev origins (3000/3001 + optional env)
const envOrigin = process.env.CLIENT_ORIGIN || "";
const ALLOWED = new Set(
  [envOrigin, "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);           // server-to-server or curl
      return cb(null, ALLOWED.has(origin));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/menu/:slug", async (req, res) => {
  try {
    const resto = await db.restaurant.findUnique({
      where: { slug: req.params.slug },
      include: {
        categories: { orderBy: { position: "asc" } },
        items: { include: { optionGroups: { include: { options: true } } } },
      },
    });
    if (!resto) return res.status(404).json({ error: "Restaurant not found" });
    res.json(resto);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
