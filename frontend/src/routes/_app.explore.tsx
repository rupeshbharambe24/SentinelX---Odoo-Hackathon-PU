import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, Clock, Wallet, Sun, Mountain, Waves, TreePine, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/explore")({
  head: () => ({ meta: [{ title: "Explore — Traveloop" }] }),
  component: ExplorePage,
});

const DESTINATIONS = [
  { name: "Tokyo", country: "Japan", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80", budget: "mid", duration: 7, activities: ["Culture", "Food", "Shopping"], climate: "Temperate", description: "Vibrant blend of ultra-modern and traditional culture." },
  { name: "Bali", country: "Indonesia", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", budget: "budget", duration: 10, activities: ["Beach", "Adventure", "Wellness"], climate: "Tropical", description: "Island paradise with stunning temples and rice terraces." },
  { name: "Paris", country: "France", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80", budget: "luxury", duration: 5, activities: ["Culture", "Food", "Shopping"], climate: "Temperate", description: "City of lights, art, cuisine, and timeless romance." },
  { name: "Reykjavik", country: "Iceland", img: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=600&q=80", budget: "mid", duration: 6, activities: ["Adventure", "Nature"], climate: "Cold", description: "Gateway to dramatic landscapes and northern lights." },
  { name: "Lisbon", country: "Portugal", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80", budget: "budget", duration: 5, activities: ["Culture", "Food", "Beach"], climate: "Mediterranean", description: "Colorful hilltop capital with world-class cuisine." },
  { name: "New York", country: "USA", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80", budget: "luxury", duration: 7, activities: ["Culture", "Shopping", "Food"], climate: "Temperate", description: "The city that never sleeps — iconic landmarks everywhere." },
];

const ACTIVITIES = [
  { name: "Sushi Making Class", location: "Tokyo, Japan", img: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80", cost: "budget", duration: 3, category: "Food", description: "Learn to make authentic sushi with a local master chef." },
  { name: "Mt. Batur Sunrise Trek", location: "Bali, Indonesia", img: "https://images.unsplash.com/photo-1512805147242-c3e794fc1b2d?w=600&q=80", cost: "mid", duration: 6, category: "Adventure", description: "Hike an active volcano under the stars to watch the sunrise." },
  { name: "Louvre Museum Tour", location: "Paris, France", img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80", cost: "luxury", duration: 4, category: "Culture", description: "Skip-the-line private tour of the world's most famous museum." },
  { name: "Glacier Ice Caving", location: "Reykjavik, Iceland", img: "https://images.unsplash.com/photo-1520626330953-294b41a346cd?w=600&q=80", cost: "luxury", duration: 8, category: "Nature", description: "Explore the magical blue ice caves of Vatnajökull glacier." },
  { name: "Pastel de Nata Baking", location: "Lisbon, Portugal", img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80", cost: "budget", duration: 2, category: "Food", description: "Bake the famous Portuguese custard tarts from scratch." },
  { name: "Broadway Show Tickets", location: "New York, USA", img: "https://images.unsplash.com/photo-1507676184212-d0330a156f48?w=600&q=80", cost: "luxury", duration: 3, category: "Culture", description: "Premium seats to a top-rated Broadway musical." },
];

const DEST_ACTIVITY_TYPES = ["Culture", "Food", "Shopping", "Beach", "Adventure", "Nature", "Wellness"];
const CLIMATES = ["Tropical", "Temperate", "Mediterranean", "Cold", "Arid"];

const ACT_CATEGORIES = ["Culture", "Food", "Shopping", "Adventure", "Nature", "Wellness"];

function ExplorePage() {
  const [search, setSearch] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [durationRange, setDurationRange] = useState([1, 14]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [climateFilter, setClimateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Activities state
  const [actSearch, setActSearch] = useState("");
  const [actCostFilter, setActCostFilter] = useState("all");
  const [actDurationRange, setActDurationRange] = useState([1, 12]);
  const [actCategoryFilter, setActCategoryFilter] = useState("all");
  const [showActFilters, setShowActFilters] = useState(false);

  const filteredDestinations = useMemo(() => {
    return DESTINATIONS.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.country.toLowerCase().includes(search.toLowerCase())) return false;
      if (budgetFilter !== "all" && d.budget !== budgetFilter) return false;
      if (d.duration < durationRange[0] || d.duration > durationRange[1]) return false;
      if (activityFilter !== "all" && !d.activities.includes(activityFilter)) return false;
      if (climateFilter !== "all" && d.climate !== climateFilter) return false;
      return true;
    });
  }, [search, budgetFilter, durationRange, activityFilter, climateFilter]);

  const filteredActivities = useMemo(() => {
    return ACTIVITIES.filter((a) => {
      if (actSearch && !a.name.toLowerCase().includes(actSearch.toLowerCase()) && !a.location.toLowerCase().includes(actSearch.toLowerCase())) return false;
      if (actCostFilter !== "all" && a.cost !== actCostFilter) return false;
      if (a.duration < actDurationRange[0] || a.duration > actDurationRange[1]) return false;
      if (actCategoryFilter !== "all" && a.category !== actCategoryFilter) return false;
      return true;
    });
  }, [actSearch, actCostFilter, actDurationRange, actCategoryFilter]);

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

        <TabsContent value="destinations" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search destinations or countries…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {(budgetFilter !== "all" || activityFilter !== "all" || climateFilter !== "all") && <Badge variant="secondary" className="ml-1 text-[10px]">Active</Badge>}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Wallet className="h-3 w-3" /> Budget Level</Label>
                <Select value={budgetFilter} onValueChange={setBudgetFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All budgets</SelectItem><SelectItem value="budget">Budget-friendly</SelectItem><SelectItem value="mid">Mid-range</SelectItem><SelectItem value="luxury">Luxury</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Clock className="h-3 w-3" /> Duration: {durationRange[0]}–{durationRange[1]} days</Label>
                <Slider min={1} max={14} step={1} value={durationRange} onValueChange={setDurationRange} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Mountain className="h-3 w-3" /> Activity Type</Label>
                <Select value={activityFilter} onValueChange={setActivityFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All activities</SelectItem>{DEST_ACTIVITY_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Sun className="h-3 w-3" /> Climate</Label>
                <Select value={climateFilter} onValueChange={setClimateFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All climates</SelectItem>{CLIMATES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{filteredDestinations.length} destinations found</p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDestinations.map((d) => (
              <div key={d.name} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover-lift">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={d.img} alt={d.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-display text-lg font-semibold drop-shadow-md">{d.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-white/85"><MapPin className="h-3 w-3" /> {d.country}</div>
                  </div>
                  <Badge className="absolute right-3 top-3 bg-white/20 text-white backdrop-blur-md border-white/20 text-[10px]">
                    {d.budget === "budget" ? "💰 Budget" : d.budget === "mid" ? "💵 Mid-range" : "💎 Luxury"}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.activities.map((a) => <Badge key={a} variant="secondary" className="text-[10px] gap-1">{a}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {d.duration} days</span>
                    <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> {d.climate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDestinations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No destinations match</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search activities or locations…" value={actSearch} onChange={(e) => setActSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => setShowActFilters(!showActFilters)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {(actCostFilter !== "all" || actCategoryFilter !== "all") && <Badge variant="secondary" className="ml-1 text-[10px]">Active</Badge>}
            </Button>
          </div>

          {showActFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Wallet className="h-3 w-3" /> Cost Level</Label>
                <Select value={actCostFilter} onValueChange={setActCostFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All costs</SelectItem><SelectItem value="budget">Budget-friendly</SelectItem><SelectItem value="mid">Mid-range</SelectItem><SelectItem value="luxury">Premium</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Clock className="h-3 w-3" /> Duration: {actDurationRange[0]}–{actDurationRange[1]} hours</Label>
                <Slider min={1} max={12} step={1} value={actDurationRange} onValueChange={setActDurationRange} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs"><Mountain className="h-3 w-3" /> Category</Label>
                <Select value={actCategoryFilter} onValueChange={setActCategoryFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{ACT_CATEGORIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{filteredActivities.length} activities found</p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActivities.map((a) => (
              <div key={a.name} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover-lift flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={a.img} alt={a.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-display text-lg font-semibold drop-shadow-md">{a.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-white/85"><MapPin className="h-3 w-3" /> {a.location}</div>
                  </div>
                  <Badge className="absolute right-3 top-3 bg-white/20 text-white backdrop-blur-md border-white/20 text-[10px]">
                    {a.cost === "budget" ? "💰 Budget" : a.cost === "mid" ? "💵 Mid-range" : "💎 Premium"}
                  </Badge>
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{a.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px] gap-1">{a.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.duration} hours</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">Add to Trip <Plus className="ml-1 h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No activities match</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
