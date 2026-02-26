import type { Metadata, Viewport } from "next";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import "./globals.css";
import { CommandPalette } from "@/components/core/command-palette";
import { OfflineBanner } from "@/components/core/offline-banner";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { Toaster } from "@/components/ui/sonner";
import { ClientThemeProvider } from "@/components/providers/client-theme-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ReferralProvider } from "@/components/providers/referral-provider";
import { AppInitializer } from "@/components/providers/app-initializer";
import { Footer } from "@/components/layout/footer";

import { Plus_Jakarta_Sans } from "next/font/google";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Earlymark — CRM for SMEs",
  description: "High-velocity CRM platform with Hub and Spoke architecture",
  icons: {
    icon: "/latest-logo.png",
    apple: "/latest-logo.png",
  },
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} antialiased font-sans bg-background text-foreground`}>
        <AppInitializer />
        <AccessibilityProvider>
          <ClientThemeProvider>
            <IndustryProvider>
              <PostHogProvider>
                <ReferralProvider>
                  {children}
                  <Footer />
                  <CommandPalette />
                  <OfflineBanner />
                  <ServiceWorkerProvider />
                  <Toaster />
                </ReferralProvider>
              </PostHogProvider>
            </IndustryProvider>
          </ClientThemeProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
