import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { SessionProvider } from "next-auth/react";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import MotionProvider from "@/components/MotionProvider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Apple-TV+/Cineby style serif. Used (italic) for big hero titles and
// emphasized section headings — body text stays Geist sans.
const instrumentSerif = Instrument_Serif({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Streamly — Movies & TV",
    template: "%s · Streamly",
  },
  description:
    "Discover and stream movies and TV series with a modern, cinematic interface. Powered by TMDB.",
  applicationName: "Streamly",
  keywords: ["movies", "tv shows", "streaming", "watch online", "cinema"],
  openGraph: {
    type: "website",
    siteName: "Streamly",
    title: "Streamly — Movies & TV",
    description:
      "Discover and stream movies and TV series. Powered by TMDB.",
    url: SITE,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <SessionProvider refetchOnWindowFocus={false}>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <footer className="border-t border-white/5 py-8 text-center text-sm text-[var(--color-muted)] space-x-3">
              <span>Built with Next.js · Data by TMDB</span>
              <span>·</span>
              <Link href="/legal" className="hover:text-white">
                Disclaimer &amp; legal
              </Link>
            </footer>
            <RegisterServiceWorker />
          </SessionProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
