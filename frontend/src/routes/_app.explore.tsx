import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Clock, Wallet, Mountain, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/explore")({
  head: () => ({ meta: [{ title: "Explore — Traveloop" }] }),
  component: ExplorePage,
});

interface City {
  id: number;
  name: string;
  country: string | null;
  cost_index: number | null;
  popularity_score: number | null;
  photo_url: string | null;
  description: string | null;
}

interface ActivityTemplate {
  id: number;
  city_id: number | null;
  name: string;
  category: string | null;
  avg_cost: number | null;
  avg_duration_min: number | null;
  description: string | null;
  photo_url: string | null;
}

const ACT_CATEGORIES = ["sightseeing", "food", "adventure", "shopping", "nightlife", "relaxation", "transport"];
const COVER_FALLBACK = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80";

function ExplorePage() {
  // Destinations tab state
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Activities tab state
  const [actSearch, setActSearch] = useState("");
  const [actCategory, setActCategory] = useState("all");
  const [actMaxCost, setActMaxCost] = useState<string>("");
  const [showActFilters, setShowActFilters] = useState(false);

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ["cities", search, country],
    queryFn: () =>
      api<City[]>("/cities", {
        query: {
          q: search.trim() || undefined,
          country: country === "all" ? undefined : country,
          limit: 60,
        },
      }),
  });

  const { data: activities, isLoading: actsLoading } = useQuery({
    queryKey: ["activity-templates", actSearch, actCategory, actMaxCost],
    queryFn: () =>
      api<ActivityTemplate[]>("/activity-templates", {
        query: {
          q: actSearch.trim() || undefined,
          category: actCategory === "all" ? undefined : actCategory,
          max_cost: actMaxCost ? Number(actMaxCost) : undefined,
          limit: 60,
        },
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Explore</h1>
        <p className="text-sm text-muted-foreground">Find your next destination or discover incredible activities.</p>
      </div>

      <Tabs defaultValue="destinations" className="space-y-5">
        <TabsList>
          <TabsTrigger value="destinations">Destinations</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* DESTINATIONS */}
        <TabsContent value="destinations" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search destinations or countries…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {country !== "all" && <Badge variant="secondary" className="ml-1 text-[10px]">Active</Badge>}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3 w-3" /> Country</Label>
                <Input
                  placeholder="e.g. Japan, France, India"
                  value={country === "all" ? "" : country}
                  onChange={(e) => setCountry(e.target.value || "all")}
                />
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {citiesLoading ? "Loading…" : `${cities?.length ?? 0} destinations`}
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {citiesLoading
              ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
              : (cities ?? []).map((d) => (
                  <div key={d.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover-lift">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={d.photo_url || COVER_FALLBACK}
                        alt={d.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-display text-lg font-semibold drop-shadow-md">{d.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-white/85"><MapPin className="h-3 w-3" /> {d.country ?? ""}</div>
                      </div>
                      {d.cost_index !== null && (
                        <Badge className="absolute right-3 top-3 bg-white/20 text-white backdrop-blur-md border-white/20 text-[10px]">
                          Cost index {d.cost_index.toFixed(0)}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      {d.description && <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>}
                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        {d.popularity_score !== null && (
                          <span className="flex items-center gap-1"><Mountain className="h-3 w-3" /> Popularity {(d.popularity_score * 100).toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {!citiesLoading && cities && cities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No destinations match</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search term or country.</p>
            </div>
          )}
        </TabsContent>

        {/* ACTIVITIES */}
        <TabsContent value="activities" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search activities…" value={actSearch} onChange={(e) => setActSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => setShowActFilters(!showActFilters)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {(actCategory !== "all" || actMaxCost) && <Badge variant="secondary" className="ml-1 text-[10px]">Active</Badge>}
            </Button>
          </div>

          {showActFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Mountain className="h-3 w-3" /> Category</Label>
                <Select value={actCategory} onValueChange={setActCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {ACT_CATEGORIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Wallet className="h-3 w-3" /> Max cost (USD)</Label>
                <Input type="number" min="0" placeholder="Any" value={actMaxCost} onChange={(e) => setActMaxCost(e.target.value)} />
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {actsLoading ? "Loading…" : `${activities?.length ?? 0} activities`}
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {actsLoading
              ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
              : (activities ?? []).map((a) => (
                  <div key={a.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover-lift flex flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={a.photo_url || COVER_FALLBACK}
                        alt={a.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-display text-base font-semibold drop-shadow-md line-clamp-1">{a.name}</h3>
                      </div>
                      {a.avg_cost !== null && (
                        <Badge className="absolute right-3 top-3 bg-white/20 text-white backdrop-blur-md border-white/20 text-[10px]">
                          ${a.avg_cost.toFixed(0)}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                      {a.description && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{a.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {a.category && <Badge variant="secondary" className="text-[10px] gap-1">{a.category}</Badge>}
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        {a.avg_duration_min ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {(a.avg_duration_min / 60).toFixed(1)}h</span> : <span />}
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Add to Trip <Plus className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {!actsLoading && activities && activities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No activities match</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search term, category, or budget.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
