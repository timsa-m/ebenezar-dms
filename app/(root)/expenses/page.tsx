import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import { getExpenses } from "@/lib/actions/expense.actions";
import ExpenseClient from "./ExpenseClient";

export default async function ExpensesPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const expenses = await getExpenses();

  return (
    <section className="home-content">
      <ExpenseClient initialExpenses={expenses} currentUser={user} />
    </section>
  );
}
