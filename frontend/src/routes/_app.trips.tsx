import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { HelpCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TripCard } from "@/components/trip-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_app/trips")({
  head: () => ({ meta: [{ title: "My Trips — Traveloop" }] }),
  component: TripsList,
});

type Trip = {
  id: string; title: string; destination: string | null; cover_image: string | null;
  start_date: string | null; end_date: string | null; budget: number | null;
};

function bucketTrip(t: Trip): "ongoing" | "upcoming" | "completed" {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!t.start_date || !t.end_date) return "upcoming";
  const start = new Date(t.start_date);
  const end = new Date(t.end_date);
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "ongoing";
}

function TripsList() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // If navigating to a child route, render the Outlet for child content
  if (path !== "/trips" && path !== "/trips/") return <Outlet />;

  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["trips", "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").order("start_date", { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter((t) =>
      t.title.toLowerCase().includes(q) || (t.destination ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const ongoing = filtered.filter((t) => bucketTrip(t) === "ongoing");
  const upcoming = filtered.filter((t) => bucketTrip(t) === "upcoming");
  const completed = filtered.filter((t) => bucketTrip(t) === "completed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My Trips</h1>
          <p className="text-sm text-muted-foreground">All your adventures in one place.</p>
        </div>
        <Button asChild className="shadow-soft">
          <Link to="/trips/new"><Plus className="mr-1 h-4 w-4" /> Plan a Trip</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search trips by name or destination…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="upcoming" className="space-y-5">
        <TabsList>
          <TabsTrigger value="ongoing">Ongoing ({ongoing.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : (
          <>
            <TabContent value="ongoing" trips={ongoing} />
            <TabContent value="upcoming" trips={upcoming} />
            <TabContent value="completed" trips={completed} />
          </>
        )}
      </Tabs>

      {/* Help & Support */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">Need help planning?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use our trip builder to create multi-city itineraries, track budgets, manage packing lists, and keep all your travel notes organized.
              Click "Plan a Trip" to get started, or explore trending destinations for inspiration.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/explore">Explore Destinations</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/trips/new">Start Planning</Link></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabContent({ value, trips }: { value: string; trips: Trip[] }) {
  return (
    <TabsContent value={value} className="mt-0">
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No {value} trips.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/trips/new">Plan a new trip</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => <TripCard key={t.id} trip={t} />)}
        </div>
      )}
    </TabsContent>
  );
}
