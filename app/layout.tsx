import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CommandPalette } from "@/components/core/command-palette";
import { OfflineBanner } from "@/components/core/offline-banner";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { Toaster } from "@/components/ui/sonner";
import { ClientThemeProvider } from "@/components/providers/client-theme-provider";

export const metadata: Metadata = {
  title: "Pj Buddy — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased font-sans bg-background text-foreground">
          <ClientThemeProvider>
            <IndustryProvider>
              {children}
              <CommandPalette />
              <OfflineBanner />
              <ServiceWorkerProvider />
              <Toaster />
            </IndustryProvider>
          </ClientThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
