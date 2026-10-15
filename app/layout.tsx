import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Frontier Compass", template: "%s · Frontier Compass" },
  description: "A field guide to where to build next.",
  robots: { index: false, follow: false }, // invite-only cohort: keep out of search engines
};

export const viewport: Viewport = { themeColor: "#F5F3EF", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={GeistMono.variable}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
