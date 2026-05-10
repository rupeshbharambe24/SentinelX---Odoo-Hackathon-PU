import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Calendar, GripVertical, MapPin, Plus, Trash2, Wallet, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TripSubNav } from "@/components/trip-sub-nav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/$tripId/builder")({
  head: () => ({ meta: [{ title: "Itinerary Builder — Traveloop" }] }),
  component: Builder,
});

type Section = {
  id: string; trip_id: string; name: string; city: string | null;
  start_date: string | null; end_date: string | null; budget: number | null; position: number;
};

type Activity = {
  id: string; section_id: string; title: string; category: string | null;
  cost: number | null; duration_hours: number | null; position: number;
};

function Builder() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_sections")
        .select("*")
        .eq("trip_id", tripId)
        .order("position");
      if (error) throw error;
      return data as Section[];
    },
  });

  const addSection = useMutation({
    mutationFn: async () => {
      const next = (sections?.length ?? 0);
      const { error } = await supabase.from("trip_sections").insert({
        trip_id: tripId,
        name: `Stop ${next + 1}`,
        position: next,
        budget: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", tripId] });
      toast.success("Section added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (newOrder: Section[]) => {
      await Promise.all(
        newOrder.map((s, i) =>
          supabase.from("trip_sections").update({ position: i }).eq("id", s.id),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections", tripId] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sections) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const next = arrayMove(sections, oldIndex, newIndex);
    qc.setQueryData(["sections", tripId], next);
    reorder.mutate(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
          </Button>
          <h1 className="font-display text-3xl font-bold">{trip?.title ?? "Itinerary"}</h1>
          {trip?.destination && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {trip.destination}
            </div>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to="/trips/$tripId/itinerary" params={{ tripId }}>
            <Eye className="mr-1 h-4 w-4" /> View itinerary
          </Link>
        </Button>
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(sections ?? []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {(sections ?? []).map((s) => <SectionCard key={s.id} section={s} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button
        onClick={() => addSection.mutate()}
        variant="outline"
        size="lg"
        className="w-full border-dashed py-8 text-muted-foreground hover:text-primary"
      >
        <Plus className="mr-2 h-4 w-4" /> Add another Section
      </Button>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const qc = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { data: activities } = useQuery({
    queryKey: ["activities", section.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("section_id", section.id)
        .order("position");
      if (error) throw error;
      return data as Activity[];
    },
  });

  const updateSection = useMutation({
    mutationFn: async (patch: Partial<Section>) => {
      const { error } = await supabase.from("trip_sections").update(patch).eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections", section.trip_id] }),
  });

  const deleteSection = useMutation({
    mutationFn: async () => {
      await supabase.from("trip_sections").delete().eq("id", section.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", section.trip_id] });
      toast.success("Section removed");
    },
  });

  const totalSpent = (activities ?? []).reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const budget = Number(section.budget ?? 0);
  const overBudget = budget > 0 && totalSpent > budget;

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs">Section name</Label>
            <Input
              defaultValue={section.name}
              onBlur={(e) => e.target.value !== section.name && updateSection.mutate({ name: e.target.value })}
              placeholder="City / Stop"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Dates</Label>
            <div className="flex gap-1.5">
              <Input
                type="date"
                defaultValue={section.start_date ?? ""}
                onBlur={(e) => updateSection.mutate({ start_date: e.target.value || null })}
              />
              <Input
                type="date"
                defaultValue={section.end_date ?? ""}
                onBlur={(e) => updateSection.mutate({ end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Wallet className="h-3 w-3" /> Budget</Label>
            <Input
              type="number"
              defaultValue={section.budget ?? ""}
              onBlur={(e) => updateSection.mutate({ budget: e.target.value ? Number(e.target.value) : 0 })}
              placeholder="0"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => deleteSection.mutate()} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 p-4">
        {(activities ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No activities yet — add one to get started.
          </div>
        )}
        {(activities ?? []).map((a) => <ActivityRow key={a.id} activity={a} />)}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <AddActivitySheet sectionId={section.id} nextPosition={(activities?.length ?? 0)} />
          <div className="text-xs text-muted-foreground">
            Spent <span className={`font-medium ${overBudget ? "text-destructive" : "text-foreground"}`}>${totalSpent.toFixed(0)}</span>
            {budget > 0 && <> / <span className="text-foreground">${budget.toFixed(0)}</span></>}
            {overBudget && <Badge variant="destructive" className="ml-2 text-[10px]">Over</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async () => { await supabase.from("activities").delete().eq("id", activity.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities", activity.section_id] }),
  });
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{activity.title}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activity.category && <span>{activity.category}</span>}
          {activity.duration_hours ? <span>{activity.duration_hours}h</span> : null}
        </div>
      </div>
      <div className="text-sm font-medium">${Number(activity.cost ?? 0).toFixed(0)}</div>
      <Button variant="ghost" size="icon" onClick={() => remove.mutate()} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AddActivitySheet({ sectionId, nextPosition }: { sectionId: string; nextPosition: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Sightseeing", cost: "", duration_hours: "1" });

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("activities").insert({
      section_id: sectionId,
      title: form.title.trim(),
      category: form.category,
      cost: form.cost ? Number(form.cost) : 0,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : 1,
      position: nextPosition,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["activities", sectionId] });
    setForm({ title: "", category: "Sightseeing", cost: "", duration_hours: "1" });
    setOpen(false);
    toast.success("Activity added");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add activity
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add activity</SheetTitle>
          <SheetDescription>What's the plan?</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Visit Senso-ji Temple" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {["Sightseeing", "Food", "Transport", "Lodging", "Adventure", "Shopping", "Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cost (USD)</Label>
              <Input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (h)</Label>
              <Input type="number" min="0" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} className="w-full">Add to itinerary</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
