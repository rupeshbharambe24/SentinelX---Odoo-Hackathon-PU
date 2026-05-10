import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Wallet, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TripSubNav } from "@/components/trip-sub-nav";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { Section } from "./_app.trips.$tripId.builder";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/_app/trips/$tripId/budget")({
  head: () => ({ meta: [{ title: "Budget Tracker — Traveloop" }] }),
  component: BudgetTracker,
});

const COLORS = [
  "oklch(0.62 0.115 192)", "oklch(0.7 0.16 50)", "oklch(0.65 0.15 320)",
  "oklch(0.7 0.15 145)", "oklch(0.65 0.18 25)", "oklch(0.7 0.13 270)",
  "oklch(0.75 0.12 90)",
];

const EXPENSE_CATEGORIES = ["transport", "stay", "activity", "meal", "other"] as const;
type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Map activity category -> expense category for the auto-sync.
const ACTIVITY_TO_EXPENSE_CATEGORY: Record<string, ExpenseCategory> = {
  transport: "transport",
  food: "meal",
  sightseeing: "activity",
  adventure: "activity",
  shopping: "other",
  nightlife: "activity",
  relaxation: "activity",
};

interface Expense {
  id: string;
  trip_id: string;
  section_id: string | null;
  category: string;
  amount: number;
  currency: string;
  note: string | null;
  expense_date: string | null;
}

function BudgetTracker() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () =>
      api<{
        name: string;
        description: string | null;
        total_budget: number | null;
        start_date: string | null;
      }>(`/trips/${tripId}`),
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: () => api<Section[]>(`/sections/by-trip/${tripId}`),
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", tripId],
    queryFn: () => api<Expense[]>(`/trips/${tripId}/expenses`),
  });

  const allActivities = (sections ?? []).flatMap((s) => s.activities);
  const planned = allActivities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const totalSpent = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const totalBudget = Number(trip?.total_budget ?? 0);
  const pct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
  const remaining = Math.max(0, totalBudget - totalSpent);

  // Charts now driven by REAL expenses (not activity costs)
  const byCategory = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    const cat = e.category || "other";
    acc[cat] = (acc[cat] ?? 0) + Number(e.amount ?? 0);
    return acc;
  }, {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const barData = (sections ?? []).map((s) => {
    const sectionExpenses = (expenses ?? []).filter((e) => e.section_id === s.id);
    const sectionSpent = sectionExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
    return {
      name: s.title.length > 12 ? s.title.slice(0, 12) + "…" : s.title,
      spent: sectionSpent,
      budget: Number(s.section_budget ?? 0),
    };
  });

  // ── mutations ──────────────────────────────────────────────────────────

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", tripId] });
      toast.success("Expense removed");
    },
  });

  const syncFromActivities = useMutation({
    mutationFn: async () => {
      // Idempotent: delete previous auto-synced expenses (note starts with "auto:activity:")
      // then re-create one expense per activity with cost > 0.
      const existing = expenses ?? [];
      const autoSynced = existing.filter((e) => e.note?.startsWith("auto:activity:"));
      for (const e of autoSynced) {
        await api(`/expenses/${e.id}`, { method: "DELETE" });
      }

      let created = 0;
      const today = trip?.start_date ?? new Date().toISOString().slice(0, 10);
      for (const s of sections ?? []) {
        for (const a of s.activities) {
          if (!a.cost || a.cost <= 0) continue;
          const expenseCategory = ACTIVITY_TO_EXPENSE_CATEGORY[a.category ?? ""] ?? "activity";
          await api("/expenses", {
            method: "POST",
            body: {
              trip_id: tripId,
              section_id: s.id,
              category: expenseCategory,
              amount: a.cost,
              currency: "USD",
              note: `auto:activity:${a.id}:${a.name}`,
              expense_date: s.start_date ?? today,
            },
          });
          created++;
        }
      }
      return { created, deletedAutos: autoSynced.length };
    },
    onSuccess: ({ created, deletedAutos }) => {
      qc.invalidateQueries({ queryKey: ["expenses", tripId] });
      qc.invalidateQueries({ queryKey: ["invoice", tripId] });
      toast.success(
        deletedAutos > 0
          ? `Refreshed ${created} expenses (replaced ${deletedAutos} previous auto-synced rows)`
          : `Created ${created} expenses from activities`,
      );
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">{trip?.name ?? "Budget Tracker"}</h1>
        {trip?.description && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {trip.description}
          </div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Total Budget</div>
          <div className="mt-1 font-display text-3xl font-bold">${totalBudget.toFixed(0)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Planned: ${planned.toFixed(0)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Total Spent</div>
          <div className={`mt-1 font-display text-3xl font-bold ${totalSpent > totalBudget && totalBudget > 0 ? "text-destructive" : "text-primary"}`}>${totalSpent.toFixed(0)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{(expenses ?? []).length} expense{(expenses ?? []).length === 1 ? "" : "s"} logged</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Remaining</div>
          <div className={`mt-1 font-display text-3xl font-bold ${remaining === 0 && totalBudget > 0 ? "text-destructive" : "text-success"}`}>${remaining.toFixed(0)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Budget Usage</span>
          <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
        </div>
        <Progress value={pct} className="h-3" />
      </div>

      {/* Logged Expenses (real /expenses) */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h3 className="font-display text-sm font-semibold">Logged Expenses</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              These flow into the invoice. Add manually, or auto-sync from your planned activities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFromActivities.mutate()}
              disabled={syncFromActivities.isPending || allActivities.length === 0}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {syncFromActivities.isPending ? "Syncing…" : "Sync from Activities"}
            </Button>
            <AddExpenseSheet tripId={tripId} sections={sections ?? []} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Note</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {expensesLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : (expenses ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No expenses logged yet. Click <strong>Sync from Activities</strong> to auto-create one expense per planned activity, or <strong>Add Expense</strong> to log one manually.
                </td></tr>
              ) : (
                (expenses ?? []).map((e) => {
                  const isAuto = e.note?.startsWith("auto:activity:");
                  const displayNote = isAuto
                    ? e.note?.split(":").slice(3).join(":") || "(auto)"
                    : e.note ?? "";
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-base">
                      <td className="px-4 py-2.5 text-muted-foreground">{e.expense_date ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                        {isAuto && <span className="ml-1 text-[10px] text-muted-foreground">auto</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{displayNote || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium">${Number(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteExpense.mutate(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {(expenses ?? []).length > 0 && (
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td colSpan={3} className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right text-primary">${totalSpent.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 font-display text-sm font-semibold">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No expenses to show</div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 font-display text-sm font-semibold">Budget vs Spent by Stop</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="oklch(0.7 0.13 188 / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Spent" fill="oklch(0.62 0.115 192)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No sections to show</div>
          )}
        </div>
      </div>

      {/* Planned activities reference */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Planned Activities</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cost set when you added the activity. These are <em>plans</em>, not logged spend.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Activity</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Section</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Planned</th>
              </tr>
            </thead>
            <tbody>
              {(sections ?? []).flatMap((s) =>
                s.activities.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-base">
                    <td className="px-4 py-2.5 font-medium">{a.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.category ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">${Number(a.cost ?? 0).toFixed(0)}</td>
                  </tr>
                ))
              )}
              {allActivities.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activities planned.</td></tr>
              )}
            </tbody>
            {allActivities.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td colSpan={3} className="px-4 py-2.5">Total planned</td>
                  <td className="px-4 py-2.5 text-right text-primary">${planned.toFixed(0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Add Expense sheet ─────────────────────────────────────────────────────────

function AddExpenseSheet({ tripId, sections }: { tripId: string; sections: Section[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    category: "activity" as ExpenseCategory,
    amount: "",
    currency: "USD",
    note: "",
    expense_date: today,
    section_id: "" as string,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter an amount > 0");
      await api("/expenses", {
        method: "POST",
        body: {
          trip_id: tripId,
          section_id: form.section_id || null,
          category: form.category,
          amount,
          currency: form.currency || "USD",
          note: form.note || null,
          expense_date: form.expense_date,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", tripId] });
      setOpen(false);
      setForm({ category: "activity", amount: "", currency: "USD", note: "", expense_date: today, section_id: "" });
      toast.success("Expense logged");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.detail : e instanceof Error ? e.message : "Add failed"),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Expense
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log an expense</SheetTitle>
          <SheetDescription>Goes into the invoice as a line item.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </div>
          </div>
          {sections.length > 0 && (
            <div className="space-y-1.5">
              <Label>Section (optional)</Label>
              <Select value={form.section_id || "_none"} onValueChange={(v) => setForm({ ...form, section_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No section</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="Hotel night, Eiffel Tower tickets…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
            {submit.isPending ? "Saving…" : "Log expense"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
