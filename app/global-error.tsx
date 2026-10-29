"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: "antialiased",
          background: "#0A0A0F",
          color: "#FFFFFF",
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
            textAlign: "center",
            maxWidth: "480px",
            width: "100%",
            padding: "2rem",
            animation: "fadeIn 0.4s ease-out forwards",
          }}
        >
          {/* Glow background */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* Content wrapper (above glow) */}
          <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "999px",
                padding: "0.3rem 0.875rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#F87171",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                marginBottom: "2rem",
              }}
            >
              Critical Error
            </div>

            {/* Icon */}
            <div
              style={{
                width: "80px",
                height: "80px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.75rem",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F87171"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                marginBottom: "0.75rem",
              }}
            >
              Application crashed
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontSize: "0.9375rem",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.65,
                marginBottom: "1.25rem",
                maxWidth: "360px",
                margin: "0 auto 1.25rem",
              }}
            >
              A critical error occurred and the application could not recover.
              Our team has been notified automatically. Please try again.
            </p>

            {/* Error digest */}
            {error?.digest && (
              <div
                style={{
                  fontSize: "0.75rem",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  marginBottom: "1.5rem",
                  letterSpacing: "0.02em",
                  display: "inline-block",
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
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                marginBottom: "2rem",
                marginTop: "1rem",
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
              <button
                id="global-error-retry-btn"
                onClick={reset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  background: "#FFFFFF",
                  color: "#111113",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  borderRadius: "0.875rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(255,255,255,0.12)",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                </svg>
                Try Again
              </button>

              <button
                id="global-error-reload-btn"
                onClick={() => window.location.assign("/")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  borderRadius: "0.875rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Reload &amp; Go to Dashboard
              </button>
            </div>

            {/* Footer brand */}
            <div
              style={{
                marginTop: "3rem",
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.02em",
              }}
            >
              Ebenezar Capital &amp; Credit Solutions LTD
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </body>
    </html>
  );
}
