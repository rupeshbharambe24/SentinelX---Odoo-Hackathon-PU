import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Globe, Wallet, TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import type { Section } from "./_app.trips.$tripId.builder";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Traveloop" }] }),
  component: Analytics,
});

const COLORS = [
  "oklch(0.62 0.115 192)", "oklch(0.7 0.16 50)", "oklch(0.65 0.15 320)",
  "oklch(0.7 0.15 145)", "oklch(0.65 0.18 25)", "oklch(0.7 0.13 270)",
];

interface Trip {
  id: string;
  name: string;
  description: string | null;
  total_budget: number | null;
  section_count: number;
  status: string;
  created_at: string;
}

function Analytics() {
  const { user } = useAuth();

  const { data: trips, isLoading: loadingTrips } = useQuery({
    queryKey: ["trips", "all", user?.id],
    enabled: !!user,
    queryFn: () => api<Trip[]>("/trips"),
  });

  // Fetch sections+activities per trip in parallel.
  const sectionResults = useQueries({
    queries: (trips ?? []).map((t) => ({
      queryKey: ["sections", t.id],
      queryFn: () => api<Section[]>(`/sections/by-trip/${t.id}`),
    })),
  });
  const sectionsByTrip: Record<string, Section[]> = {};
  (trips ?? []).forEach((t, idx) => {
    sectionsByTrip[t.id] = sectionResults[idx]?.data ?? [];
  });

  const allActivities = Object.values(sectionsByTrip).flatMap((ss) => ss.flatMap((s) => s.activities));
  const totalSpent = allActivities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const totalBudget = (trips ?? []).reduce((sum, t) => sum + Number(t.total_budget ?? 0), 0);
  const uniqueDestinations = new Set((trips ?? []).map((t) => t.description).filter(Boolean)).size;

  // By category
  const byCategory = allActivities.reduce<Record<string, number>>((acc, a) => {
    const cat = a.category || "Other";
    acc[cat] = (acc[cat] ?? 0) + Number(a.cost ?? 0);
    return acc;
  }, {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  // By trip
  const barData = (trips ?? []).map((t) => {
    const sec = sectionsByTrip[t.id] ?? [];
    const spent = sec.flatMap((s) => s.activities).reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
    return {
      name: t.name.length > 15 ? t.name.slice(0, 15) + "…" : t.name,
      spent,
      budget: Number(t.total_budget ?? 0),
    };
  });

  // Monthly trend
  const monthlyData = (trips ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.created_at) {
      const month = t.created_at.slice(0, 7);
      const sec = sectionsByTrip[t.id] ?? [];
      const spent = sec.flatMap((s) => s.activities).reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
      acc[month] = (acc[month] ?? 0) + spent;
    }
    return acc;
  }, {});
  const lineData = Object.entries(monthlyData).sort().map(([month, amount]) => ({ month, amount }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Overview of your travel stats and spending.</p>
      </div>

      {/* Admin pointer — admin section now lives in its own /admin portal */}
      {user?.is_admin && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
          You're an admin. Platform-wide analytics live in the dedicated{" "}
          <a href="/admin" className="font-medium text-destructive underline">Admin Portal</a>.
        </div>
      )}

      {loadingTrips ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Trips", value: trips?.length ?? 0, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
              { label: "Destinations", value: uniqueDestinations, icon: Globe, color: "text-chart-2", bg: "bg-chart-2/10" },
              { label: "Total Spent", value: `$${totalSpent.toFixed(0)}`, icon: Wallet, color: "text-chart-3", bg: "bg-chart-3/10" },
              { label: "Total Budget", value: `$${totalBudget.toFixed(0)}`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="font-display text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 font-display text-sm font-semibold">Spending by Category</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet</div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 font-display text-sm font-semibold">Budget vs Spent by Trip</h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
                    <Bar dataKey="budget" name="Budget" fill="oklch(0.7 0.13 188 / 0.3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Spent" fill="oklch(0.62 0.115 192)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet</div>
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-display text-sm font-semibold">Monthly Spending Trend</h3>
            {lineData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 200)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
                  <Line type="monotone" dataKey="amount" name="Spent" stroke="oklch(0.62 0.115 192)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {lineData.length === 1 ? "Need more trips to show a trend" : "No spending data yet"}
              </div>
            )}
          </div>

          {/* Trips Table */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display text-sm font-semibold">All Trips Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Trip</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Notes</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Budget</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Spent</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Stops</th>
                  </tr>
                </thead>
                <tbody>
                  {(trips ?? []).map((t) => {
                    const sec = sectionsByTrip[t.id] ?? [];
                    const spent = sec.flatMap((s) => s.activities).reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-base">
                        <td className="px-4 py-2.5 font-medium">{t.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{t.description ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">${Number(t.total_budget ?? 0).toFixed(0)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-primary">${spent.toFixed(0)}</td>
                        <td className="px-4 py-2.5 text-right">{t.section_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

