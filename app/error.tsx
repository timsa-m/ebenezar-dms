"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  const isUnauthorized =
    error?.message?.toLowerCase().includes("unauthorized") ||
    error?.message?.toLowerCase().includes("forbidden");

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
        background: "#F8F9FA",
        color: "#111113",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
            background: isUnauthorized
              ? "rgba(245, 158, 11, 0.07)"
              : "rgba(239, 68, 68, 0.07)",
            border: `1px solid ${isUnauthorized ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.15)"}`,
            borderRadius: "999px",
            padding: "0.3rem 0.875rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: isUnauthorized ? "#B45309" : "#B91C1C",
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            marginBottom: "1.75rem",
          }}
        >
          {isUnauthorized ? "Access Denied" : "Something went wrong"}
        </div>

        {/* Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            background: isUnauthorized ? "#FFFBEB" : "#FEF2F2",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.75rem",
            border: `1px solid ${isUnauthorized ? "#FDE68A" : "#FEE2E2"}`,
          }}
        >
          {isUnauthorized ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
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
          {isUnauthorized
            ? "You don't have permission"
            : "An unexpected error occurred"}
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: "0.9375rem",
            color: "#6B7280",
            lineHeight: 1.65,
            marginBottom: "1.25rem",
            maxWidth: "360px",
          }}
        >
          {isUnauthorized
            ? "You need Manager or Admin privileges to perform this action. Contact your administrator if you think this is a mistake."
            : "Something went wrong on our end. This error has been logged. Try again or return to the dashboard."}
        </p>

        {/* Error digest (dev-friendly) */}
        {error?.digest && (
          <div
            style={{
              fontSize: "0.75rem",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              color: "#9CA3AF",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.75rem",
              marginBottom: "1.5rem",
              letterSpacing: "0.02em",
            }}
          >
            Error ID: {error.digest}
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #E5E7EB, transparent)",
            marginBottom: "2rem",
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
          {!isUnauthorized && (
            <button
              id="error-retry-btn"
              onClick={reset}
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
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              </svg>
              Try Again
            </button>
          )}

          <Link
            href="/"
            id="error-dashboard-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              background: isUnauthorized ? "#111113" : "transparent",
              color: isUnauthorized ? "#FFFFFF" : "#374151",
              fontSize: "0.9375rem",
              fontWeight: isUnauthorized ? 600 : 500,
              borderRadius: "0.875rem",
              textDecoration: "none",
              border: isUnauthorized ? "none" : "1px solid #E5E7EB",
              boxShadow: isUnauthorized ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go to Dashboard
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
          Ebenezar Enterprises Ltd
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
