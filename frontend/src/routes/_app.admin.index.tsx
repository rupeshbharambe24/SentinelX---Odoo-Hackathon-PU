import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Map, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Traveloop" }] }),
  component: AdminDashboard,
});

interface AdminStats {
  total_users: number;
  total_trips: number;
  trips_today: number;
  active_users_30d: number;
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api<AdminStats>("/admin/stats"),
  });

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-4">Platform Overview</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Real-time stats from /admin/stats endpoint.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total users",
              value: data?.total_users ?? 0,
              sublabel: "across all signups",
              icon: Users,
              iconBg: "bg-primary/10",
              iconText: "text-primary",
            },
            {
              label: "Total trips",
              value: data?.total_trips ?? 0,
              sublabel: "all-time",
              icon: Map,
              iconBg: "bg-chart-2/10",
              iconText: "text-chart-2",
            },
            {
              label: "Trips today",
              value: data?.trips_today ?? 0,
              sublabel: "since midnight",
              icon: Calendar,
              iconBg: "bg-chart-3/10",
              iconText: "text-chart-3",
            },
            {
              label: "Active 30d",
              value: data?.active_users_30d ?? 0,
              sublabel: "logged in last 30 days",
              icon: Activity,
              iconBg: "bg-success/10",
              iconText: "text-success",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}
              >
                <s.icon className={`h-5 w-5 ${s.iconText}`} />
              </div>
              <div className="font-display text-3xl font-bold">{s.value}</div>
              <div className="mt-1 text-sm font-medium">{s.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.sublabel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
