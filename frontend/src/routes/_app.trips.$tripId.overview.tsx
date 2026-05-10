import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Wallet, Sparkles, Eye, Hammer, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TripSubNav } from "@/components/trip-sub-nav";
import { api } from "@/lib/api";
import { format } from "date-fns";
import type { Section } from "./_app.trips.$tripId.builder";

export const Route = createFileRoute("/_app/trips/$tripId/overview")({
  head: () => ({ meta: [{ title: "Trip Overview — Traveloop" }] }),
  component: TripOverview,
});

interface TripDetail {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  total_budget: number | null;
  status: string;
  is_public: boolean;
  public_slug: string | null;
}

interface PackingItem { id: string; trip_id: string; name: string; category: string; is_packed: boolean; }
interface Note { id: string; trip_id: string; title: string | null; content: string | null; }

function TripOverview() {
  const { tripId } = Route.useParams();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api<TripDetail>(`/trips/${tripId}`),
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: () => api<Section[]>(`/sections/by-trip/${tripId}`),
  });

  const { data: packingItems } = useQuery({
    queryKey: ["packing", tripId],
    queryFn: () => api<PackingItem[]>(`/trips/${tripId}/packing`),
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", tripId],
    queryFn: () => api<Note[]>(`/trips/${tripId}/notes`),
  });

  const allActivities = (sections ?? []).flatMap((s) => s.activities);
  const totalSpent = allActivities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const totalBudget = Number(trip?.total_budget ?? 0);
  const budgetPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  // Completeness score
  const checks = [
    !!trip?.name,
    !!trip?.description,
    !!trip?.start_date,
    !!trip?.end_date,
    (sections?.length ?? 0) > 0,
    allActivities.length > 0,
    totalBudget > 0,
    (packingItems?.length ?? 0) > 0,
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const categories = allActivities.reduce<Record<string, number>>((acc, a) => {
    const cat = a.category || "Other";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">{trip?.name ?? "Trip Overview"}</h1>
        {trip?.description && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {trip.description}
          </div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Hero Cover */}
          {trip?.cover_photo_url && (
            <div className="relative overflow-hidden rounded-3xl shadow-card">
              <img src={trip.cover_photo_url} alt={trip.name} className="h-56 w-full object-cover sm:h-72" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <h2 className="font-display text-2xl font-bold">{trip.name}</h2>
                {trip.start_date && trip.end_date && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Stops", value: sections?.length ?? 0, icon: MapPin, color: "text-primary" },
              { label: "Activities", value: allActivities.length, icon: Sparkles, color: "text-chart-2" },
              { label: "Packing Items", value: packingItems?.length ?? 0, icon: CheckCircle2, color: "text-success" },
              { label: "Notes", value: notes?.length ?? 0, icon: Clock, color: "text-chart-3" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
                <div className="font-display text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Completeness & Budget */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 font-display text-sm font-semibold">Trip Readiness</h3>
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-20">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${completeness}, 100`} className="text-primary transition-all duration-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold">{completeness}%</span>
                </div>
                <div className="flex-1 space-y-1 text-xs text-muted-foreground">
                  {checks.map((c, i) => {
                    const labels = ["Title", "Destination", "Start date", "End date", "Sections", "Activities", "Budget set", "Packing list"];
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3 w-3 ${c ? "text-success" : "text-muted-foreground/40"}`} />
                        <span className={c ? "" : "opacity-50"}>{labels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 font-display text-sm font-semibold">Budget Summary</h3>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-primary">${totalSpent.toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">of ${totalBudget.toFixed(0)}</span>
                </div>
                <Progress value={budgetPct} className="h-2.5" />
                <div className="text-xs text-muted-foreground">
                  {totalBudget > 0 ? `${budgetPct.toFixed(0)}% of budget used` : "No budget set"}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Categories */}
          {Object.keys(categories).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 font-display text-sm font-semibold">Activity Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <Badge key={cat} variant="secondary" className="gap-1.5 px-3 py-1.5">
                    {cat} <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Day-by-day stages */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold">Trip Stages</h3>
            {(sections ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No sections yet.</p>
                <Button asChild className="mt-3"><Link to="/trips/$tripId/builder" params={{ tripId }}>Start building</Link></Button>
              </div>
            ) : (
              <div className="relative space-y-0">
                {(sections ?? []).map((s, idx) => (
                  <div key={s.id} className="relative flex gap-4 pb-6">
                    <div className="flex flex-col items-center">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-hero font-display text-sm font-bold text-primary-foreground shadow-soft">{idx + 1}</div>
                      {idx < (sections?.length ?? 0) - 1 && <div className="mt-1 w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-soft">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-display text-base font-semibold">{s.title}</h4>
                          {s.start_date && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(s.start_date), "MMM d")}
                              {s.end_date && ` – ${format(new Date(s.end_date), "MMM d")}`}
                            </div>
                          )}
                        </div>
                        {s.section_budget && s.section_budget > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Wallet className="mr-1 h-3 w-3" />${Number(s.section_budget).toFixed(0)}
                          </Badge>
                        )}
                      </div>
                      {s.activities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {s.activities.slice(0, 5).map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-[10px]">{a.name}</Badge>
                          ))}
                          {s.activities.length > 5 && <Badge variant="secondary" className="text-[10px]">+{s.activities.length - 5} more</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/trips/$tripId/builder" params={{ tripId }}><Hammer className="mr-1 h-4 w-4" /> Edit Builder</Link></Button>
            <Button asChild variant="outline"><Link to="/trips/$tripId/itinerary" params={{ tripId }}><Eye className="mr-1 h-4 w-4" /> View Itinerary</Link></Button>
            <Button asChild variant="outline"><Link to="/trips/$tripId/budget" params={{ tripId }}><Wallet className="mr-1 h-4 w-4" /> Budget Tracker</Link></Button>
          </div>
        </>
      )}
    </div>
  );
}
