import type { Metadata } from "next";
import { headers } from "next/headers";
import { site } from "@/lib/site";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth/provider";
import { themeBootstrap } from "@/lib/theme-bootstrap";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Sprachwelten – kostenlose Sprachspiele online",
    template: "%s | Sprachwelten",
  },
  description:
    "Kostenlose Sprachspiele für dich und deine Freunde: Redewendungen, Dialekte, Tabu und Zungenbrecher. Direkt im Browser, auf Deutsch und Englisch.",
  applicationName: site.name,
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale =
    (await headers()).get("x-sprachwelten-locale") === "en" ? "en" : "de";
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(${themeBootstrap.toString()})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider initialLocale={locale}>{children}</I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
