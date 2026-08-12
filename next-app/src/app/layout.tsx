import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-4">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight hover:text-primary"
            >
              Cert Prep
            </Link>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
