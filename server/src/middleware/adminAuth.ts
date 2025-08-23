import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const required = process.env.ADMIN_TOKEN?.trim();
  // If no token configured, auth is disabled (dev-friendly)
  if (!required) return next();

  const hdr = req.headers.authorization || "";
  const match = hdr.match(/^Bearer\s+(.+)$/i);
  const headerToken = match?.[1];

  const queryToken = typeof req.query.token === "string" ? (req.query.token as string) : undefined;

  const token = headerToken || queryToken;
  if (token && token === required) return next();

  return res.status(401).json({ error: "Unauthorized" });
}
