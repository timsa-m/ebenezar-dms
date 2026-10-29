// Force all report pages to be server-rendered on every request
// so data is always fresh from the database (no stale cached pages).
export const dynamic = 'force-dynamic';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
