import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth/provider";

export const metadata: Metadata = {
  title: "Sprachwelten",
  description: "Redewendungen entdecken, Sprachen erraten und mit Freunden spielen.",
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
    <html lang="de" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`(${function(){try{const saved=localStorage.getItem('sprachwelten-theme');document.documentElement.dataset.theme=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch{}}.toString()})();`}}/></head>
      <body className="antialiased"><ThemeProvider><AuthProvider><I18nProvider>{children}</I18nProvider></AuthProvider></ThemeProvider></body>
    </html>
  );
}
