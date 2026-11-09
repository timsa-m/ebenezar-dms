import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import ScrollRestorer from "@/components/ScrollRestorer";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  title: "Ebenezar Enterprises Car Bazaar | Kisumu, Kenya",
  description: "Premier Dealer Management System, Inventory Showroom, and Asset-Backed Hire-Purchase Auto Financing.",
  manifest: "/manifest.json",
  icons: {
    icon: '/icons/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ebenezar Car Bazaar",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors duration-200">
        <ThemeProvider>
          <ScrollRestorer />
          {children}
          <ScrollToTopButton />
          <Toaster 
            position="bottom-right" 
            richColors 
            closeButton 
            toastOptions={{
              classNames: {
                error: 'bg-red-600 text-white border-red-700',
                success: 'bg-emerald-600 text-white border-emerald-700',
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}