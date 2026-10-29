import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Reload app automatically when network comes back
  reloadOnOnline: false,
  // Offline fallback page (app/~offline/page.tsx)
  fallbacks: {
    document: '/~offline',
  },
  // Exclude large generated files from precaching
  publicExcludes: [
    '!ledger-analysis-report.json',
    '!ledger-ingestion-report.json',
    '!dashboard-banner.jpg',
    '!rightsidepage.png',
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rvgibgrftzcpjvkbagti.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'rvgibgrftzcpjvkbagti.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],

    // IMPORTANT FIX
    unoptimized: true,
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

  async headers() {
    return [
      {
        // Global HTTP Security Headers for all routes
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        // CORS headers for public API integration
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },

};

export default withSentryConfig(withPWA(nextConfig), {
  silent: true,
  org: 'jsm-x9',
  project: 'javascript-nextjs',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});