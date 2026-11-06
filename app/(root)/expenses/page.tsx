import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import { getExpenses } from "@/lib/actions/expense.actions";
import ExpenseClient from "./ExpenseClient";
import { checkFinancialAccess } from "@/lib/security/actions";
import { hasPermission } from "@/lib/security/rbac";
import FinancialAccessGate from "@/components/security/FinancialAccessGate";

export default async function ExpensesPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  if (!hasPermission(user.role, 'financial.reports.view')) {
    redirect('/');
  }

  const hasAccess = await checkFinancialAccess();
  if (!hasAccess) {
    return (
      <FinancialAccessGate
        title="Protected Operating Expenses"
        description="Confidential operating overheads, dealership expenditures, and vehicle reconditioning ledgers. Confirm your password to access."
      />
    );
  }

  const expenses = await getExpenses();

  return (
    <section className="home-content">
      <ExpenseClient initialExpenses={expenses} currentUser={user} />
    </section>
  );
}
