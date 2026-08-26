import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Len Bible — Read, Learn, Grow",
  description:
    "A gamified chronological Bible reading app with quizzes, streaks, and leaderboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
