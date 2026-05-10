import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Trophy, Award } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/admin/activities")({
  head: () => ({ meta: [{ title: "Popular Activities — Traveloop" }] }),
  component: PopularActivitiesPage,
});

interface PopularActivity {
  template_id: number;
  name: string;
  city_name: string | null;
  usage_count: number;
}

const BAR_FILL = "oklch(0.7 0.16 50)";

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span>1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Award className="h-4 w-4 text-slate-400" />
        <span>2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Award className="h-4 w-4 text-orange-700" />
        <span>3</span>
      </span>
    );
  }
  return <span className="font-bold text-muted-foreground">{rank}</span>;
}

function PopularActivitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "popular", "activities", 20],
    queryFn: () =>
      api<PopularActivity[]>("/admin/popular/activities", {
        query: { limit: 20 },
      }),
  });

  const list = data ?? [];
  const chartData = list.slice(0, 10).map((a) => ({
    name: truncate(a.name, 30),
    uses: a.usage_count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Popular Activities
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Activity templates most often added to trips.
        </p>
      </div>

      {isLoading ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No activities have been added to trips yet — top activities will
            appear here once users start planning.
          </p>
        </div>
      ) : (
        <>
          {/* Bar chart card — top 10 */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-display text-sm font-semibold">
              Top 10 by usage
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 32)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="oklch(0.9 0 0 / 0.4)"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} uses`, "Usage"]}
                  cursor={{ fill: "oklch(0.95 0 0 / 0.4)" }}
                />
                <Bar dataKey="uses" fill={BAR_FILL} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Full table — all 20 */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="border-b border-border p-5">
              <h3 className="font-display text-sm font-semibold">
                All popular activities
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ranked by total appearances across all user trips.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a, i) => {
                  const rank = i + 1;
                  return (
                    <TableRow key={a.template_id}>
                      <TableCell>
                        <RankCell rank={rank} />
                      </TableCell>
                      <TableCell
                        className="max-w-[320px] truncate font-medium"
                        title={a.name}
                      >
                        {truncate(a.name, 60)}
                      </TableCell>
                      <TableCell>
                        {a.city_name ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {a.city_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {a.usage_count}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
