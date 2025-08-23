"use client";

import { useState, useEffect } from "react";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/admin-token";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const r = useRouter();
  const [token, setTokenState] = useState("");

  useEffect(() => { setTokenState(getAdminToken()); }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <p className="text-sm text-slate-600">
        Paste the admin token. Your browser will remember it (local only).
      </p>
      <input
        value={token}
        onChange={(e) => setTokenState(e.target.value)}
        placeholder="ADMIN_TOKEN…"
        className="w-full rounded-xl border px-3 py-2"
        type="password"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setAdminToken(token.trim()); r.push("/admin"); }}
          className="rounded-xl bg-black px-4 py-2 text-white"
        >
          Save & go to dashboard
        </button>
        <button
          onClick={() => { clearAdminToken(); setTokenState(""); }}
          className="rounded-xl border px-4 py-2"
        >
          Clear
        </button>
      </div>
    </main>
  );
}
