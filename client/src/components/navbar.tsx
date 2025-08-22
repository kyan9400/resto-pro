"use client";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export default function Navbar() {
  const { items, subtotal } = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="sticky top-0 z-50">
      <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-teal-400" />
      <nav className="backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-violet-700 to-sky-600">
            Demo Deli
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition">Menu</Link>
            <a href="#" className="hover:text-slate-900 transition">About</a>
            <a href="#" className="hover:text-slate-900 transition">Contact</a>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-900 hover:text-white transition"
          >
            <span>Cart{count ? ` (${count})` : ""}</span>
            <span className="opacity-70">• ${(subtotal/100).toFixed(2)}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
