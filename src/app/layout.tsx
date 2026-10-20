import type { Metadata, Viewport } from "next";
import { Geist, Literata } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-bible",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lenbible.app";

export const metadata: Metadata = {
  title: {
    default: "Len Bible — Read, understand, keep going",
    template: "%s · Len Bible",
  },
  description:
    "A gamified chronological Bible reading app with comprehension quizzes, streaks, and chapter discussion.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Len Bible",
    description:
      "Read Scripture in event order. Pass short quizzes. Build a streak that means understanding.",
    url: siteUrl,
    siteName: "Len Bible",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Len Bible",
    description: "Gamified chronological Bible reading with quizzes and streaks.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Len Bible",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${literata.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
