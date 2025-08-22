import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const app = express();
const db = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Public menu endpoint
app.get("/api/menu/:slug", async (req, res) => {
  try {
    const resto = await db.restaurant.findUnique({
      where: { slug: req.params.slug },
      include: {
        categories: { orderBy: { position: "asc" } },
        items: {
          include: {
            optionGroups: { include: { options: true } }
          }
        }
      }
    });
    if (!resto) return res.status(404).json({ error: "Restaurant not found" });
    res.json(resto);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
