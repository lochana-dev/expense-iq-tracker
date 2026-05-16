import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Search, Download, Target, Sparkles } from "lucide-react";
import { format, parseISO, startOfMonth, isWithinInterval, endOfMonth, subMonths } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CATEGORIES,
  formatINR,
  getCategory,
  type Transaction,
  type TransactionType,
} from "@/lib/expense-types";
import {
  generateID,
  loadBudget,
  loadTransactions,
  saveBudget,
  saveTransactions,
} from "@/lib/expense-storage";

type FilterType = "all" | TransactionType;
type FilterPeriod = "all" | "this-month" | "last-month";

interface ExpenseDashboardProps {}

export function ExpenseDashboard(_: ExpenseDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>("this-month");
  const [addOpen, setAddOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // hydrate
  useEffect(() => {
    setTransactions(loadTransactions());
    setBudget(loadBudget());
  }, []);

  useEffect(() => {
    if (transactions.length || localStorage.getItem("expenseiq.transactions.v1")) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  // totals (all-time for balance, this-month for spend tracking)
  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const monthSpend = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    return transactions
      .filter((t) => t.type === "expense" && isWithinInterval(parseISO(t.date), interval))
      .reduce((a, t) => a + t.amount, 0);
  }, [transactions]);

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
        if (periodFilter === "this-month") {
          const i = { start: startOfMonth(now), end: endOfMonth(now) };
          if (!isWithinInterval(parseISO(t.date), i)) return false;
        } else if (periodFilter === "last-month") {
          const lm = subMonths(now, 1);
          const i = { start: startOfMonth(lm), end: endOfMonth(lm) };
          if (!isWithinInterval(parseISO(t.date), i)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, categoryFilter, search, periodFilter]);

  // pie data: this-month expense by category
  const pieData = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense" && isWithinInterval(parseISO(t.date), interval))
      .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
    return Array.from(map.entries())
      .map(([catId, value]) => {
        const c = getCategory(catId);
        return { name: c.name, value, color: c.color, icon: c.icon };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // bar data: last 6 months
  const barData = useMemo(() => {
    const now = new Date();
    const out: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const interval = { start: startOfMonth(m), end: endOfMonth(m) };
      const inMonth = transactions.filter((t) =>
        isWithinInterval(parseISO(t.date), interval)
      );
      out.push({
        month: format(m, "MMM"),
        income: inMonth.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
        expense: inMonth.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
      });
    }
    return out;
  }, [transactions]);

  const budgetPct = budget > 0 ? Math.min(100, (monthSpend / budget) * 100) : 0;
  const budgetStatus =
    budgetPct >= 100 ? "exceeded" : budgetPct >= 80 ? "warning" : "ok";

  function handleAdd(tx: Omit<Transaction, "id">) {
    setTransactions((prev) => [{ ...tx, id: generateID() }, ...prev]);
    toast.success("Transaction added", {
      description: `${tx.text} • ${formatINR(tx.amount)}`,
    });
    setAddOpen(false);
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.success("Transaction removed");
  }

  function handleExport() {
    const headers = ["Date", "Description", "Category", "Type", "Amount (INR)"];
    const rows = transactions.map((t) => [
      t.date,
      `"${t.text.replace(/"/g, '""')}"`,
      getCategory(t.category).name,
      t.type,
      (t.type === "expense" ? -t.amount : t.amount).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenseiq-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  function handleSaveBudget(value: number) {
    setBudget(value);
    saveBudget(value);
    setBudgetOpen(false);
    toast.success("Monthly budget updated", { description: formatINR(value) });
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] glow-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Expense<span className="gradient-text">IQ</span>
              </h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                Smarter money tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Sheet open={addOpen} onOpenChange={setAddOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="gap-2 bg-[image:var(--gradient-primary)] glow-primary">
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </SheetTrigger>
              <AddTransactionSheet onAdd={handleAdd} />
            </Sheet>
          </div>
        </header>

        {/* Hero - balance + breakdown */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-3xl p-6 md:col-span-1 md:p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Net Balance
              </span>
            </div>
            <div className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              {formatINR(totals.balance)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {transactions.length} total transactions
            </p>
          </div>

          <StatCard
            label="Income"
            value={formatINR(totals.income)}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="income"
          />
          <StatCard
            label="Expenses"
            value={formatINR(totals.expense)}
            icon={<TrendingDown className="h-4 w-4" />}
            accent="expense"
          />
        </section>

        {/* Budget card */}
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Monthly Budget</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "MMMM yyyy")}
                </p>
              </div>
            </div>
            <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {budget > 0 ? "Edit budget" : "Set budget"}
                </Button>
              </DialogTrigger>
              <BudgetDialog current={budget} onSave={handleSaveBudget} />
            </Dialog>
          </div>

          {budget > 0 ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {formatINR(monthSpend)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      of {formatINR(budget)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    {budgetStatus === "exceeded" ? (
                      <span className="font-medium text-[color:var(--expense)]">
                        Budget exceeded by {formatINR(monthSpend - budget)}
                      </span>
                    ) : budgetStatus === "warning" ? (
                      <span className="font-medium text-[color:var(--chart-3)]">
                        Approaching limit — {formatINR(budget - monthSpend)} left
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatINR(budget - monthSpend)} remaining
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right text-3xl font-bold tabular-nums">
                  {budgetPct.toFixed(0)}%
                </div>
              </div>
              <Progress
                value={budgetPct}
                className={
                  budgetStatus === "exceeded"
                    ? "[&>div]:bg-[color:var(--expense)]"
                    : budgetStatus === "warning"
                      ? "[&>div]:bg-[color:var(--chart-3)]"
                      : "[&>div]:bg-[image:var(--gradient-primary)]"
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Set a monthly budget to track your spending against a goal.
            </p>
          )}
        </section>

        {/* Charts */}
        <section className="grid gap-4 lg:grid-cols-5">
          <div className="glass-card rounded-3xl p-6 md:p-8 lg:col-span-2">
            <h2 className="text-lg font-semibold">Spending by Category</h2>
            <p className="text-sm text-muted-foreground">This month</p>
            {pieData.length === 0 ? (
              <EmptyChart message="No expenses this month yet" />
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {pieData.length > 0 && (
              <ul className="mt-4 space-y-2">
                {pieData.slice(0, 5).map((d) => (
                  <li key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span>{d.icon} {d.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatINR(d.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 md:p-8 lg:col-span-3">
            <h2 className="text-lg font-semibold">6-Month Overview</h2>
            <p className="text-sm text-muted-foreground">Income vs expenses</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="month" stroke="oklch(0.7 0.03 270)" fontSize={12} />
                  <YAxis
                    stroke="oklch(0.7 0.03 270)"
                    fontSize={12}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <ReTooltip content={<BarTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "oklch(0.7 0.03 270)" }}
                  />
                  <Bar dataKey="income" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--chart-7)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Filters + List */}
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Transactions</h2>
            <span className="text-sm text-muted-foreground">
              {filtered.length} shown
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income only</SelectItem>
                <SelectItem value="expense">Expense only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as FilterPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="md:col-span-4 lg:col-span-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ul className="mt-6 space-y-2">
            {filtered.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No transactions match your filters.
              </li>
            ) : (
              filtered.map((t) => {
                const c = getCategory(t.category);
                const isExpense = t.type === "expense";
                return (
                  <li
                    key={t.id}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:bg-card/70"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={{ background: `color-mix(in oklab, ${c.color} 18%, transparent)` }}
                    >
                      {c.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.name} • {format(parseISO(t.date), "dd MMM yyyy")}
                      </div>
                    </div>
                    <div
                      className={`text-right font-semibold tabular-nums ${
                        isExpense
                          ? "text-[color:var(--expense)]"
                          : "text-[color:var(--income)]"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatINR(t.amount)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4 text-[color:var(--expense)]" />
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          Data stored locally in your browser. Export regularly to keep a backup.
        </footer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "income" | "expense";
}) {
  const gradient = accent === "income" ? "var(--gradient-income)" : "var(--gradient-expense)";
  return (
    <div className="glass-card relative overflow-hidden rounded-3xl p-6 md:p-8">
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div
        className="relative mt-3 text-3xl font-bold tracking-tight md:text-4xl"
        style={{
          backgroundImage: gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="font-medium">{p.payload.icon} {p.name}</div>
      <div className="text-muted-foreground">{formatINR(p.value)}</div>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="capitalize">{p.dataKey}:</span>
          <span className="font-medium">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="mt-4 flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function AddTransactionSheet({
  onAdd,
}: {
  onAdd: (tx: Omit<Transaction, "id">) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const visibleCats = CATEGORIES.filter((c) => c.type === type);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!text.trim() || !Number.isFinite(num) || num <= 0) {
      toast.error("Please enter a description and positive amount.");
      return;
    }
    onAdd({
      text: text.trim().slice(0, 80),
      amount: Number(num.toFixed(2)),
      type,
      category,
      date,
    });
    setText("");
    setAmount("");
  }

  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>New transaction</SheetTitle>
        <SheetDescription>
          Track an income or an expense in seconds.
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={submit} className="mt-6 space-y-5 px-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory(CATEGORIES.find((c) => c.type === t)!.id);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                type === t
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="text">Description</Label>
          <Input
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Coffee with Sarah"
            maxLength={80}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <SheetFooter className="px-0">
          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-primary)] glow-primary"
          >
            Add transaction
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}

function BudgetDialog({
  current,
  onSave,
}: {
  current: number;
  onSave: (v: number) => void;
}) {
  const [value, setValue] = useState(String(current || ""));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    onSave(Number(num.toFixed(2)));
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Set monthly budget</DialogTitle>
        <DialogDescription>
          You'll see progress bars and alerts as you approach your limit.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget amount (₹)</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="50000"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="submit" className="w-full">
            Save budget
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
