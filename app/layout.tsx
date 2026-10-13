import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Sprachwelten – Andere Worte. Neue Welten.",
  description: "Redewendungen entdecken, Bedeutungen erfinden und mit Freunden bluffen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
