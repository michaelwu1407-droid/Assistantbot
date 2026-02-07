import type { Metadata } from "next";
import "./globals.css";
import { CommandPalette } from "@/components/core/command-palette";
import { OfflineBanner } from "@/components/core/offline-banner";
import { IndustryProvider } from "@/components/providers/industry-provider";

export const metadata: Metadata = {
  title: "Pj Buddy — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <IndustryProvider>
          {children}
          <CommandPalette />
          <OfflineBanner />
        </IndustryProvider>
      </body>
    </html>
  );
}
