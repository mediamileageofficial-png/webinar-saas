import type { Metadata } from "next";
import "./globals.css";

// Using the system font stack (defined in globals.css) instead of next/font/google
// so the build doesn't depend on fetching fonts.googleapis.com at build time.

export const metadata: Metadata = {
  title: "Webinar SaaS",
  description:
    "Multi-tenant registration, payment, and lead automation platform for academies, coaching institutes, and event organizers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
