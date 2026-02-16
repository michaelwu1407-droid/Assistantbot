import type { Metadata, Viewport } from "next";
import { ConditionalClerkProvider } from "@/components/providers/conditional-clerk-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
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
    <ConditionalClerkProvider>
      <AccessibilityProvider>
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
      </AccessibilityProvider>
    </ConditionalClerkProvider>
  );
}
