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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ebenezar_theme')||(document.cookie.match(/ebenezar_theme=([^;]+)/)||[])[1];if(t==='graphite'){document.documentElement.classList.add('dark','graphite');}else if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('graphite');}else if(t==='light'){document.documentElement.classList.remove('dark','graphite');}}catch(e){}})()`,
          }}
        />
      </head>
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