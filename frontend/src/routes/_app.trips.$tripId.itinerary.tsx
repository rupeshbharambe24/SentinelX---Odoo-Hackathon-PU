import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDown, Calendar, MapPin, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { TripSubNav } from "@/components/trip-sub-nav";
import { format } from "date-fns";
import type { Section } from "./_app.trips.$tripId.builder";

export const Route = createFileRoute("/_app/trips/$tripId/itinerary")({
  head: () => ({ meta: [{ title: "Itinerary — Traveloop" }] }),
  component: ItineraryView,
});

interface TripDetail {
  id: string;
  name: string;
  description: string | null;
  total_budget: number | null;
}

function ItineraryView() {
  const { tripId } = Route.useParams();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api<TripDetail>(`/trips/${tripId}`),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: () => api<Section[]>(`/sections/by-trip/${tripId}`),
  });

  const allActivities = (data ?? []).flatMap((s) => s.activities);
  const totalSpent = allActivities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const totalBudget = Number(trip?.total_budget ?? 0);
  const pct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
          </Button>
          <h1 className="font-display text-3xl font-bold">{trip?.name ?? "Itinerary"}</h1>
          {trip?.description && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {trip.description}
            </div>
          )}
        </div>
        <Button asChild>
          <Link to="/trips/$tripId/builder" params={{ tripId }}>
            <Pencil className="mr-1 h-4 w-4" /> Edit itinerary
          </Link>
        </Button>
      </div>

      <TripSubNav tripId={tripId} />

      {/* Sticky budget summary */}
      <div className="sticky top-16 z-30 -mx-4 rounded-none border-y border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Spent / Budget</div>
              <div className="font-display text-lg font-semibold">
                ${totalSpent.toFixed(0)} <span className="text-muted-foreground">/ ${totalBudget.toFixed(0)}</span>
              </div>
            </div>
          </div>
          <div className="min-w-[180px] flex-1">
            <Progress value={pct} className="h-2" />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{data?.length ?? 0}</span> stops</span>
            <span><span className="font-medium text-foreground">{allActivities.length}</span> activities</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No sections yet.</p>
          <Button asChild className="mt-4">
            <Link to="/trips/$tripId/builder" params={{ tripId }}>Build itinerary</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {data!.map((s, idx) => (
            <section key={s.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-hero font-display text-sm font-bold text-primary-foreground shadow-soft">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold">{s.title}</h2>
                  {(s.start_date || s.end_date) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {s.start_date ? format(new Date(s.start_date), "MMM d") : "?"}
                      {s.end_date && ` – ${format(new Date(s.end_date), "MMM d")}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-0">
                {s.activities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No activities planned.
                  </div>
                ) : (
                  s.activities.map((a, i) => (
                    <div key={a.id}>
                      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr,auto]">
                        <div className="rounded-xl border border-border bg-card p-4 shadow-soft hover-lift">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{a.name}</div>
                              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {a.category && <span className="rounded-full bg-muted px-2 py-0.5">{a.category}</span>}
                                {a.duration_min ? <span>{(a.duration_min / 60).toFixed(1)}h</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-primary/5 px-4 py-3 sm:min-w-[120px]">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expense</div>
                          <div className="font-display text-lg font-semibold text-primary">${Number(a.cost ?? 0).toFixed(0)}</div>
                        </div>
                      </div>
                      {i < s.activities.length - 1 && (
                        <div className="my-1 flex justify-center">
                          <ArrowDown className="h-4 w-4 text-primary/50" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
