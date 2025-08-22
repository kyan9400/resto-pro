import type { Response } from "express";
import { randomUUID } from "crypto";

type Client = { id: string; res: Response };
const channels = new Map<string, Set<Client>>(); // key by restaurant slug

export function addClient(channel: string, res: Response) {
  const id = randomUUID();
  const set = channels.get(channel) ?? new Set<Client>();
  set.add({ id, res });
  channels.set(channel, set);

  // Send an initial comment so clients know we're live
  res.write(`: connected ${id}\n\n`);

  // Clean up on close
  res.on("close", () => {
    const cur = channels.get(channel);
    if (cur) {
      for (const c of cur) if (c.id === id) cur.delete(c);
      if (cur.size === 0) channels.delete(channel);
    }
  });
}

export function publish(channel: string, event: string, data: any) {
  const set = channels.get(channel);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const { res } of set) res.write(payload);
}
