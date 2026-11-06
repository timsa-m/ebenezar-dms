import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import { checkFinancialAccess } from "@/lib/security/actions";
import { hasPermission } from "@/lib/security/rbac";
import FinancialAccessGate from "@/components/security/FinancialAccessGate";

// Force all report pages to be server-rendered on every request
// so data is always fresh from the database (no stale cached pages).
export const dynamic = 'force-dynamic';

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const user = await getLoggedInUser();
  if (!user) redirect('/sign-in');

  if (!hasPermission(user.role, 'financial.reports.view')) {
    redirect('/');
  }

  const hasAccess = await checkFinancialAccess();
  if (!hasAccess) {
    return (
      <FinancialAccessGate
        title="Confidential Financial Reports"
        description="This section contains protected dealership revenue, profit & loss statements, collections, arrears delinquency, and audit records for Ebenezar Enterprises Ltd. Enter your password to authorize access for this session."
      />
    );
  }

  return <>{children}</>;
}
