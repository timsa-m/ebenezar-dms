import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'swap',
});

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
    <html lang="en" className="antialiased">
      <body className={`${inter.variable} ${ibmPlexSerif.variable} min-h-screen bg-[#FAFAFA] text-gray-900 selection:bg-accent/20 selection:text-accent`}>
        {children}
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
      </body>
    </html>
  );
}