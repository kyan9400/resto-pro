import ky from "ky";
import { getAdminToken } from "@/lib/admin-token";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = ky.create({
  prefixUrl: BASE,
  hooks: {
    beforeRequest: [
      (request) => {
        try {
          const t = getAdminToken();
          if (t) request.headers.set("Authorization", `Bearer ${t}`);
        } catch {}
      },
    ],
  },
});
