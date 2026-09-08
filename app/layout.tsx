import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter, self-hosted by next/font at build time (no runtime request to
// fonts.googleapis.com). globals.css keeps a full system-font fallback stack
// so the UI still renders correctly if the font fails to load.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Webinar SaaS",
  description:
    "Multi-tenant registration, payment, and lead automation platform for academies, coaching institutes, and event organizers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
