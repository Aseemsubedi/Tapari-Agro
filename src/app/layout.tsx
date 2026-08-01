import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tapari Agro",
    template: "%s · Tapari Agro",
  },
  description:
    "Tapari Agro — fresh, hygienic, best-quality organic staples from Parbat, Myagdi & Mustang. Direct from kishan to home.",
  icons: {
    icon: "/images/tapari-favicon.jpg",
    apple: "/images/tapari-logo-mark.jpg",
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-chalk text-ink">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
