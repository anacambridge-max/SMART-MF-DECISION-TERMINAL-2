import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart MF Daily Decision Terminal",
  description:
    "Real-time dashboard for Indian mutual fund investors — NSE index data, fund NAV opportunity scoring, market regime classifier, and sector heatmaps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
