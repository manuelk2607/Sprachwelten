import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
