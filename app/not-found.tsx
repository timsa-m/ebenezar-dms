import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Ebenezar",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
        background: "#F8F9FA",
        color: "#111113",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            maxWidth: "480px",
            width: "100%",
            animation: "fadeIn 0.4s ease-out forwards",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "rgba(59, 130, 246, 0.07)",
              border: "1px solid rgba(59, 130, 246, 0.15)",
              borderRadius: "999px",
              padding: "0.3rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#3B82F6",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "1.75rem",
            }}
          >
            <span>Error 404</span>
          </div>

          {/* Giant number */}
          <div
            style={{
              fontSize: "clamp(6rem, 20vw, 9rem)",
              fontWeight: 800,
              letterSpacing: "-0.06em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #111113 0%, #4B5563 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "1.5rem",
              userSelect: "none",
            }}
          >
            404
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#111113",
              marginBottom: "0.75rem",
            }}
          >
            Page not found
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: "0.9375rem",
              color: "#6B7280",
              lineHeight: 1.65,
              marginBottom: "2.25rem",
              maxWidth: "340px",
            }}
          >
            The page you&apos;re looking for has been moved, deleted, or never
            existed. Double-check the URL or head back to the dashboard.
          </p>

          {/* Divider */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, #E5E7EB, transparent)",
              marginBottom: "2.25rem",
            }}
          />

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              width: "100%",
            }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                background: "#111113",
                color: "#FFFFFF",
                fontSize: "0.9375rem",
                fontWeight: 600,
                borderRadius: "0.875rem",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                transition: "background 0.15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go to Dashboard
            </Link>

            <Link
              href="/loans"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: "#374151",
                fontSize: "0.9375rem",
                fontWeight: 500,
                borderRadius: "0.875rem",
                textDecoration: "none",
                border: "1px solid #E5E7EB",
                transition: "all 0.15s ease",
              }}
            >
              View Loans
            </Link>
          </div>

          {/* Footer brand */}
          <div
            style={{
              marginTop: "3rem",
              fontSize: "0.75rem",
              color: "#9CA3AF",
              letterSpacing: "0.02em",
            }}
          >
            Ebenezar Capital &amp; Credit Solutions LTD
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
  );
}
