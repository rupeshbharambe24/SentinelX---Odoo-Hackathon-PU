import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TripCard } from "@/components/trip-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Traveloop" }] }),
  component: Dashboard,
});

interface Trip {
  id: string;
  name: string;
  description: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number | null;
}

interface City {
  id: number;
  name: string;
  country: string | null;
  photo_url: string | null;
  popularity_score: number | null;
}

function Dashboard() {
  const { user } = useAuth();

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", "recent", user?.id],
    enabled: !!user,
    queryFn: () => api<Trip[]>("/trips", { query: { sort: "-created_at" } }),
  });

  // Replaces the previous hardcoded REGIONS = [Tokyo/Lisbon/Bali/Reykjavik] mock.
  // /cities/recommended returns top-12 by popularity_score from the seeded
  // 33,645-city catalog.
  const { data: regions } = useQuery({
    queryKey: ["cities", "recommended"],
    queryFn: () => api<City[]>("/cities/recommended", { query: { limit: 8 } }),
  });

  const greeting = user?.first_name || "there";

  return (
    <div className="space-y-10">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-card sm:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-white/70">Welcome back</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Hi {greeting} 👋</h1>
            <p className="mt-2 max-w-md text-white/90">
              Where to next? Build a new itinerary or pick up a trip in progress.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="shadow-soft">
                <Link to="/trips/new">
                  <Plus className="mr-1 h-4 w-4" /> Plan a Trip
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                <Link to="/trips/new">
                  <Sparkles className="mr-1 h-4 w-4" /> Suggest with AI
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <Input
              placeholder="Search destinations…"
              className="border-white/30 bg-white/10 pl-9 text-white placeholder:text-white/60 focus-visible:ring-white/50"
            />
          </div>
        </div>
      </section>

      {/* Top regions */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Trending destinations</h2>
            <p className="text-sm text-muted-foreground">Inspiration for your next loop</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(regions ?? []).slice(0, 8).map((r) => (
            <Link
              key={r.id}
              to="/explore"
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl text-left text-white shadow-card hover-lift"
            >
              {r.photo_url ? (
                <img
                  src={r.photo_url}
                  alt={r.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <div className="font-display text-base font-semibold">{r.name}</div>
                <div className="text-xs text-white/80">{r.country ?? ""}</div>
              </div>
            </Link>
          ))}
          {!regions && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}
        </div>
      </section>

      {/* Recent trips */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent trips</h2>
            <p className="text-sm text-muted-foreground">Pick up where you left off</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/trips">View all</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        ) : (
          <EmptyTrips />
        )}
      </section>
    </div>
  );
}

function EmptyTrips() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Plus className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold">No trips yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Start planning your first multi-city adventure.
      </p>
      <Button asChild className="mt-5">
        <Link to="/trips/new">Plan a Trip</Link>
      </Button>
    </div>
  );
}
