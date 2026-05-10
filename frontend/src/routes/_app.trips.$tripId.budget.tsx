import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TripSubNav } from "@/components/trip-sub-nav";
import { api } from "@/lib/api";
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

function BudgetTracker() {
  const { tripId } = Route.useParams();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () =>
      api<{
        name: string;
        description: string | null;
        total_budget: number | null;
      }>(`/trips/${tripId}`),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: () => api<Section[]>(`/sections/by-trip/${tripId}`),
  });

  const allActivities = (data ?? []).flatMap((s) => s.activities);
  const totalSpent = allActivities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const totalBudget = Number(trip?.total_budget ?? 0);
  const pct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
  const remaining = Math.max(0, totalBudget - totalSpent);

  // By category
  const byCategory = allActivities.reduce<Record<string, number>>((acc, a) => {
    const cat = a.category || "Other";
    acc[cat] = (acc[cat] ?? 0) + Number(a.cost ?? 0);
    return acc;
  }, {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  // By section
  const barData = (data ?? []).map((s) => ({
    name: s.title.length > 12 ? s.title.slice(0, 12) + "…" : s.title,
    spent: s.activities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0),
    budget: Number(s.section_budget ?? 0),
  }));

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

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Total Budget</div>
              <div className="mt-1 font-display text-3xl font-bold">${totalBudget.toFixed(0)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Total Spent</div>
              <div className={`mt-1 font-display text-3xl font-bold ${totalSpent > totalBudget && totalBudget > 0 ? "text-destructive" : "text-primary"}`}>${totalSpent.toFixed(0)}</div>
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

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pie Chart - By Category */}
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

            {/* Bar Chart - By Section */}
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

          {/* Expense Table */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display text-sm font-semibold">All Expenses</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Activity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Section</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).flatMap((s) =>
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No expenses yet.</td></tr>
                  )}
                </tbody>
                {allActivities.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/50 font-medium">
                      <td colSpan={3} className="px-4 py-2.5">Total</td>
                      <td className="px-4 py-2.5 text-right text-primary">${totalSpent.toFixed(0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
