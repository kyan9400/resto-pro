import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ReactQueryProvider } from "@/providers/react-query";
import { CartProvider } from "@/components/cart-provider";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demo Deli",
  description: "Modern restaurant ordering"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 antialiased`}>
        <ReactQueryProvider>
          <CartProvider>
            <Navbar />
            {children}
          </CartProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
