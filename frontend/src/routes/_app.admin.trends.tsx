import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/admin/trends")({
  head: () => ({ meta: [{ title: "Growth Trends — Traveloop Admin" }] }),
  component: AdminTrends,
});

interface TrendPoint {
  date: string;
  trips_created: number;
}

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
];

function AdminTrends() {
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trends", days],
    queryFn: () => api<TrendPoint[]>("/admin/trends", { query: { days } }),
  });

  const points = data ?? [];
  const totalTrips = points.reduce((sum, p) => sum + p.trips_created, 0);

  const chartData = points.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    trips_created: p.trips_created,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Growth Trends</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trips created per day over the selected window.
        </p>
      </div>

      {/* Days selector */}
      <div className="flex flex-wrap gap-2">
        {DAY_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={days === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Stat card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:max-w-xs">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="font-display text-3xl font-bold">{totalTrips}</div>
        )}
        <div className="mt-1 text-sm font-medium">Total trips in window</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Across the last {days} days
        </div>
      </div>

      {/* Line chart card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold">
            Trips created per day
          </h3>
        </div>

        {isLoading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 200)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="trips_created"
                name="Trips created"
                stroke="oklch(0.62 0.115 192)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            No trips created yet in this window. Try a longer range.
          </div>
        )}
      </div>
    </div>
  );
}
