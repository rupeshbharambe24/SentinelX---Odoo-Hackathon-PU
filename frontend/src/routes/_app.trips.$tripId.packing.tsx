import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, MapPin, Package, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripSubNav } from "@/components/trip-sub-nav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/$tripId/packing")({
  head: () => ({ meta: [{ title: "Packing List — Traveloop" }] }),
  component: PackingList,
});

const CATEGORIES = ["Clothing", "Toiletries", "Electronics", "Documents", "Medicine", "Accessories", "Snacks", "General"];

type PackingItem = {
  id: string; trip_id: string; category: string; name: string; packed: boolean; created_at: string;
};

function PackingList() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["packing", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("packing_items").select("*").eq("trip_id", tripId).order("created_at");
      if (error) throw error;
      return data as PackingItem[];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Name required");
      const { error } = await supabase.from("packing_items").insert({ trip_id: tripId, name: newName.trim(), category: newCategory });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packing", tripId] }); setNewName(""); toast.success("Item added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePacked = useMutation({
    mutationFn: async ({ id, packed }: { id: string; packed: boolean }) => {
      const { error } = await supabase.from("packing_items").update({ packed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packing", tripId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("packing_items").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packing", tripId] }); toast.success("Item removed"); },
  });

  const total = items?.length ?? 0;
  const packed = items?.filter((i) => i.packed).length ?? 0;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  // Group by category
  const grouped = (items ?? []).reduce<Record<string, PackingItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">{trip?.title ?? "Packing List"}</h1>
        {trip?.destination && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {trip.destination}</div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          {/* Progress */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-semibold">Packing Progress</span>
              </div>
              <span className="text-sm font-medium">{packed}/{total} packed</span>
            </div>
            <Progress value={pct} className="h-3" />
            {pct === 100 && total > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5" /> All packed! You're ready to go.</div>
            )}
          </div>

          {/* Add Item */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Item name</Label>
              <Input placeholder="Passport, charger, sunscreen…" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem.mutate()} />
            </div>
            <div className="w-full space-y-1.5 sm:w-40">
              <Label className="text-xs">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => addItem.mutate()} disabled={!newName.trim()} className="w-full sm:w-auto">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
              <Button variant="secondary" className="w-full sm:w-auto text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20">
                <Sparkles className="mr-1 h-4 w-4" /> AI Suggestions
              </Button>
            </div>
          </div>

          {/* Items by Category */}
          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No items yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Start adding items to your packing list.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => {
                const catPacked = catItems.filter((i) => i.packed).length;
                return (
                  <div key={category} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-semibold">{category}</h3>
                        <Badge variant="secondary" className="text-[10px]">{catPacked}/{catItems.length}</Badge>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {catItems.map((item) => (
                        <div key={item.id} className={`flex items-center gap-3 px-4 py-3 transition-base ${item.packed ? "bg-success/5" : ""}`}>
                          <Checkbox
                            checked={item.packed}
                            onCheckedChange={(checked) => togglePacked.mutate({ id: item.id, packed: !!checked })}
                          />
                          <span className={`flex-1 text-sm ${item.packed ? "line-through text-muted-foreground" : ""}`}>{item.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
