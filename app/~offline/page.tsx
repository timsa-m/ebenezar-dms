/**
 * Offline Fallback Page — app/~offline/page.tsx
 *
 * Served by the Workbox service worker when:
 *  - The user is offline, AND
 *  - The requested page is not in the Cache API (never visited before)
 *
 * For pages already cached by the Network First strategy, the cached
 * version is served instead and this page is never shown.
 */
export default function OfflineFallbackPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>You are offline — Ebenezar</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
            background: #ffffff;
            color: #111113;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .card {
            max-width: 400px;
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }

          .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
          }

          .signal-icon {
            width: 64px;
            height: 64px;
            background: #FEF2F2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
          }

          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
          }

          p {
            font-size: 0.9375rem;
            color: #6B7280;
            line-height: 1.6;
          }

          .hint {
            font-size: 0.8125rem;
            color: #9CA3AF;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 0.75rem;
            padding: 0.875rem 1rem;
            line-height: 1.5;
          }

          .hint strong { color: #374151; }

          .retry-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            background: #3B82F6;
            color: #ffffff;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
          }

          .retry-btn:hover { background: #2563EB; }

          .dot-row { display: flex; gap: 0.4rem; justify-content: center; }
          .dot-row span { width: 6px; height: 6px; border-radius: 50%; background: #D1D5DB; }
        `}</style>
      </head>
      <body>
        <div className="card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/icons/elelyon(trans).png" alt="Ebenezar" />

          <div className="signal-icon">📶</div>

          <h1>You are offline</h1>
          <p>
            Ebenezar could not reach the server. Check your connection and try
            again — your data is safe.
          </p>

          <div className="hint">
            <strong>Already visited pages</strong> are available offline. Any
            actions you take will sync automatically when you reconnect.
          </div>

          <a className="retry-btn" href="javascript:location.reload()">
            &#8635; Try again
          </a>

          <div className="dot-row"><span /><span /><span /></div>
        </div>
      </body>
    </html>
  );
}

