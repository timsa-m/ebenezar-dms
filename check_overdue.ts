import { getDashboardMetrics, autoFlagOverdueLoans } from "./lib/actions/loan.actions";

async function main() {
  console.log("Starting overdue job...");
  await autoFlagOverdueLoans();
  console.log("Overdue job completed.");

  const metrics = await getDashboardMetrics();
  console.log("Total Overdue Loans:", metrics.overdueLoans);
}

main().catch(console.error);
