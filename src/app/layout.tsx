import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AdsPulse OS — Điều hành Meta Ads & Đối soát Lợi nhuận thực",
  description:
    "Trung tâm giám sát Tài sản Meta, KPI Tài chính theo phiên bản, Kho Creative Drive & Post ID, Trình Lên Ads 3 luồng PAUSED, Báo cáo đa tầng và AI Briefing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-[#f8fafc] text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
