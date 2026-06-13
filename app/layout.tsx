import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientThemeProvider } from "@/components/providers/client-theme-provider";

import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

// Editorial display serif for marketing headings (warm, optical-sized).
const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Earlymark | AI assistant and CRM for tradies",
  description: "Earlymark helps tradies answer calls, follow up leads, and run the CRM without extra admin.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/latest-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/latest-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
}
