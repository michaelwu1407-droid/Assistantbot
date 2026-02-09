import type { Metadata } from "next";
import "./globals.css";
import { CommandPalette } from "@/components/core/command-palette";
import { OfflineBanner } from "@/components/core/offline-banner";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <IndustryProvider>
            {children}
            <CommandPalette />
            <OfflineBanner />
            <ServiceWorkerProvider />
            <Toaster />
          </IndustryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

