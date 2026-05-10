import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Plane, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/admin/recent")({
  head: () => ({ meta: [{ title: "Recent Activity — Traveloop" }] }),
  component: AdminRecent,
});

interface RecentTrip {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

function AdminRecent() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "recent", 20],
    queryFn: () => api<RecentTrip[]>("/admin/recent", { query: { limit: 20 } }),
  });

  const items = data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest 20 trips created on the platform.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <Skeleton className="h-20 flex-1 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No trips created yet — newly created trips will appear here as they happen.
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {items.map((item, idx) => {
            const createdDate = new Date(item.created_at);
            const isLast = idx === items.length - 1;
            return (
              <div key={item.id} className="relative flex gap-4 pb-6">
                <div className="flex flex-col items-center">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Plane className="h-5 w-5" />
                  </div>
                  {!isLast && <div className="mt-1 w-0.5 flex-1 bg-border" />}
                </div>
                <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h4 className="font-display text-base font-semibold">{item.name}</h4>
                  <div className="mt-1 text-xs text-muted-foreground">
                    by{" "}
                    <span className="font-mono text-foreground/80">
                      {item.user_id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(createdDate, { addSuffix: true })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {format(createdDate, "MMM d, yyyy h:mm a")}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
