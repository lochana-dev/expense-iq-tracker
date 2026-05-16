import type { Transaction } from "./expense-types";

const TX_KEY = "expenseiq.transactions.v1";
const BUDGET_KEY = "expenseiq.budget.v1";

const isBrowser = () => typeof window !== "undefined";

export function loadTransactions(): Transaction[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return seedDemo();
    const parsed = JSON.parse(raw) as Transaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTransactions(txs: Transaction[]) {
  if (!isBrowser()) return;
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

export function loadBudget(): number {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(BUDGET_KEY);
  const num = raw ? Number(raw) : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function saveBudget(amount: number) {
  if (!isBrowser()) return;
  localStorage.setItem(BUDGET_KEY, String(amount));
}

export function generateID(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function seedDemo(): Transaction[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  return [
    { id: generateID(), text: "Monthly Salary", amount: 75000, type: "income", category: "salary", date: daysAgo(20) },
    { id: generateID(), text: "Freelance Project", amount: 12000, type: "income", category: "freelance", date: daysAgo(10) },
    { id: generateID(), text: "Groceries", amount: 3200, type: "expense", category: "food", date: daysAgo(2) },
    { id: generateID(), text: "Uber rides", amount: 850, type: "expense", category: "transport", date: daysAgo(3) },
    { id: generateID(), text: "Electricity bill", amount: 1450, type: "expense", category: "bills", date: daysAgo(5) },
    { id: generateID(), text: "Netflix", amount: 499, type: "expense", category: "entertainment", date: daysAgo(7) },
    { id: generateID(), text: "New headphones", amount: 4200, type: "expense", category: "shopping", date: daysAgo(12) },
  ];
}
