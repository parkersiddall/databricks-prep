import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { ThemeSync, themeScript } from "@/components/settings/theme-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cert Prep",
    template: "%s · Cert Prep",
  },
  description:
    "Practice exams for the Databricks Data Engineer Associate certification.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // `themeScript` sets data-theme on this element before React hydrates, so
      // the server HTML (which has no such attribute) will not match. This is the
      // one place that discrepancy is intended: suppression is scoped to this
      // element's own attributes and does not extend into the tree.
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before first paint, so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeSync />

        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight hover:text-primary"
            >
              Cert Prep
            </Link>
            <Link
              href="/settings"
              className="text-sm text-muted hover:text-foreground"
            >
              Settings
            </Link>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
