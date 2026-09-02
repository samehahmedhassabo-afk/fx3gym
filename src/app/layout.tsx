import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "FX3 — Fight & Fitness Centre",
  description: "FX3 Gym management system",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = await getTheme();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-theme={theme}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
