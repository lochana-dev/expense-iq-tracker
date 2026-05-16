import { createFileRoute } from "@tanstack/react-router";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpenseIQ — Smart Personal Expense Tracker" },
      {
        name: "description",
        content:
          "Track income, expenses, and monthly budgets with categories, charts, and CSV export. Private, offline-first money management.",
      },
      { property: "og:title", content: "ExpenseIQ — Smart Personal Expense Tracker" },
      {
        property: "og:description",
        content:
          "Categorized transactions, budget alerts, and visual analytics — all stored locally in your browser.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <ExpenseDashboard />
      <Toaster />
    </>
  );
}
