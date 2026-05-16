export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  text: string;
  amount: number; // always positive; sign derived from type
  type: TransactionType;
  category: string;
  date: string; // ISO yyyy-mm-dd
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string; // CSS var reference
}

export const CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", icon: "🍔", type: "expense", color: "var(--chart-3)" },
  { id: "transport", name: "Transport", icon: "🚗", type: "expense", color: "var(--chart-5)" },
  { id: "shopping", name: "Shopping", icon: "🛍️", type: "expense", color: "var(--chart-4)" },
  { id: "bills", name: "Bills & Utilities", icon: "💡", type: "expense", color: "var(--chart-7)" },
  { id: "entertainment", name: "Entertainment", icon: "🎬", type: "expense", color: "var(--chart-1)" },
  { id: "health", name: "Health", icon: "💊", type: "expense", color: "var(--chart-8)" },
  { id: "other-expense", name: "Other", icon: "📦", type: "expense", color: "var(--chart-6)" },
  { id: "salary", name: "Salary", icon: "💰", type: "income", color: "var(--chart-2)" },
  { id: "freelance", name: "Freelance", icon: "💻", type: "income", color: "var(--chart-5)" },
  { id: "investment", name: "Investment", icon: "📈", type: "income", color: "var(--chart-6)" },
  { id: "other-income", name: "Other Income", icon: "✨", type: "income", color: "var(--chart-1)" },
];

export function getCategory(id: string): Category {
  return (
    CATEGORIES.find((c) => c.id === id) ?? {
      id: "other-expense",
      name: "Other",
      icon: "📦",
      type: "expense",
      color: "var(--chart-6)",
    }
  );
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
