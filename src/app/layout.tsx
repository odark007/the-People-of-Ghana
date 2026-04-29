import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | People of Ghana",
    default: "People of Ghana",
  },
  description:
    "A civic transparency platform. Find your leaders, report community issues, and hold government accountable.",
  keywords: ["Ghana", "civic", "government", "transparency", "accountability", "reports"],
  authors: [{ name: "People of Ghana" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "People of Ghana",
  },
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "People of Ghana",
    title: "People of Ghana",
    description: "Civic transparency. Find your leaders. Report issues.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className={`${dmSans.className} bg-[var(--surface)] antialiased`}>
        <div className="app-container relative">
          {children}
        </div>
      </body>
    </html>
  );
}
