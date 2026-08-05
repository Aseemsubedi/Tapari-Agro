import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Outfit, Source_Sans_3 } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { PwaRegister } from "@/components/pwa-register";
import { getSiteUrl, siteSeo } from "@/lib/seo";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nepali = Noto_Sans_Devanagari({
  variable: "--font-nepali",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#145c2a" },
    { media: "(prefers-color-scheme: dark)", color: "#145c2a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteSeo.defaultTitle,
    template: "%s · Tapari Agro",
  },
  description: siteSeo.defaultDescription,
  keywords: [...siteSeo.keywords],
  applicationName: siteSeo.name,
  authors: [{ name: siteSeo.name }],
  creator: siteSeo.name,
  publisher: siteSeo.name,
  category: "shopping",
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tapari Agro",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/icons/icon-192.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteSeo.locale,
    url: "/",
    siteName: siteSeo.name,
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "geo.region": "NP",
    "geo.placename": "Nepal",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${nepali.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-chalk text-ink">
        <CartProvider>
          {children}
          <PwaRegister />
        </CartProvider>
      </body>
    </html>
  );
}
