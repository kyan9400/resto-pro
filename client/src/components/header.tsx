"use client";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export default function Header() {
  const { items, subtotal } = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">Demo Deli</Link>
        <Link
          href="/cart"
          className="rounded-full border px-3 py-1 text-sm hover:bg-black hover:text-white transition"
        >
          Cart {count ? `(${count})` : ""} • ${(subtotal/100).toFixed(2)}
        </Link>
      </div>
    </header>
  );
}
