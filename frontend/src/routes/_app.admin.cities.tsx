import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Trophy } from "lucide-react";
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/admin/cities")({
  head: () => ({ meta: [{ title: "Popular Destinations — Traveloop" }] }),
  component: PopularCities,
});

interface PopularCity {
  city_id: number;
  name: string;
  country: string | null;
  visit_count: number;
}

const BAR_COLOR = "oklch(0.62 0.115 192)";

function rankAccent(rank: number): string | null {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-600";
  return null;
}

function PopularCities() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "popular-cities", 20],
    queryFn: () =>
      api<PopularCity[]>("/admin/popular/cities", { query: { limit: 20 } }),
  });

  const cities = data ?? [];
  const chartData = cities.slice(0, 10).map((c) => ({
    name: c.country ? `${c.name} (${c.country})` : c.name,
    visits: c.visit_count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          Popular Destinations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cities most pinned to trip sections.
        </p>
      </div>

      {/* Bar chart card — top 10 */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 font-display text-sm font-semibold">
          Top 10 cities by visits
        </h3>
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={160}
              />
              <Tooltip
                formatter={(value: number) => [`${value}`, "Visits"]}
                cursor={{ fill: "oklch(0.62 0.115 192 / 0.08)" }}
              />
              <Bar dataKey="visits" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No trips have referenced cities yet — popular destinations will
            appear here once users start planning.
          </div>
        )}
      </div>

      {/* Full table — all 20 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-sm font-semibold">
            Full leaderboard
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Top {cities.length || 20} most-visited cities across all trips.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Rank</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Visit count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : cities.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No trips have referenced cities yet — popular destinations
                  will appear here once users start planning.
                </TableCell>
              </TableRow>
            ) : (
              cities.map((c, i) => {
                const rank = i + 1;
                const accent = rankAccent(rank);
                return (
                  <TableRow key={c.city_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{rank}</span>
                        {accent && (
                          <Badge
                            variant="secondary"
                            className="gap-1 px-1.5 py-0.5"
                          >
                            <Trophy className={`h-3 w-3 ${accent}`} />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.country ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {c.visit_count}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
