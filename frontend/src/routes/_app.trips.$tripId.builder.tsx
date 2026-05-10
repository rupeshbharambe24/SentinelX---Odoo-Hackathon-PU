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
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/$tripId/builder")({
  head: () => ({ meta: [{ title: "Itinerary Builder — Traveloop" }] }),
  component: Builder,
});

interface Trip {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Activity {
  id: string;
  section_id: string;
  template_id: number | null;
  name: string;
  category: string | null;
  cost: number;
  duration_min: number;
  scheduled_at: string | null;
  notes: string | null;
  order_index: number;
  next_activity_id: string | null;
}

export interface Section {
  id: string;
  trip_id: string;
  city_id: number | null;
  city_name: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  section_budget: number | null;
  order_index: number;
  activities: Activity[];
}

function Builder() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api<Trip>(`/trips/${tripId}`),
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections", tripId],
    queryFn: () => api<Section[]>(`/sections/by-trip/${tripId}`),
  });

  const addSection = useMutation({
    mutationFn: () => {
      const next = sections?.length ?? 0;
      return api<Section>("/sections", {
        method: "POST",
        body: {
          trip_id: tripId,
          title: `Stop ${next + 1}`,
          section_budget: 0,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", tripId] });
      toast.success("Section added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (newOrder: Section[]) =>
      api("/sections/reorder", {
        method: "POST",
        body: { trip_id: tripId, section_ids: newOrder.map((s) => s.id) },
      }),
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
          <h1 className="font-display text-3xl font-bold">{trip?.name ?? "Itinerary"}</h1>
          {trip?.description && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {trip.description}
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

  const updateSection = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api(`/sections/${section.id}`, { method: "PUT", body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections", section.trip_id] }),
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const deleteSection = useMutation({
    mutationFn: () => api(`/sections/${section.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", section.trip_id] });
      toast.success("Section removed");
    },
  });

  const activities = section.activities;
  const totalSpent = activities.reduce((sum, a) => sum + Number(a.cost ?? 0), 0);
  const budget = Number(section.section_budget ?? 0);
  const overBudget = budget > 0 && totalSpent > budget;

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs">Section title</Label>
            <Input
              defaultValue={section.title}
              onBlur={(e) => e.target.value !== section.title && updateSection.mutate({ title: e.target.value })}
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
              defaultValue={section.section_budget ?? ""}
              onBlur={(e) => updateSection.mutate({ section_budget: e.target.value ? Number(e.target.value) : 0 })}
              placeholder="0"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => deleteSection.mutate()} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 p-4">
        {activities.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No activities yet — add one to get started.
          </div>
        )}
        {activities.map((a) => <ActivityRow key={a.id} activity={a} tripId={section.trip_id} />)}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <AddActivitySheet sectionId={section.id} tripId={section.trip_id} />
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

function ActivityRow({ activity, tripId }: { activity: Activity; tripId: string }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api(`/activities/${activity.id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections", tripId] }),
  });
  const durationHours = activity.duration_min ? (activity.duration_min / 60).toFixed(1) : null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{activity.name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activity.category && <span>{activity.category}</span>}
          {durationHours ? <span>{durationHours}h</span> : null}
        </div>
      </div>
      <div className="text-sm font-medium">${Number(activity.cost ?? 0).toFixed(0)}</div>
      <Button variant="ghost" size="icon" onClick={() => remove.mutate()} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AddActivitySheet({ sectionId, tripId }: { sectionId: string; tripId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "sightseeing", cost: "", duration_min: "60" });

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    try {
      await api("/activities", {
        method: "POST",
        body: {
          section_id: sectionId,
          name: form.name.trim(),
          category: form.category,
          cost: form.cost ? Number(form.cost) : 0,
          duration_min: form.duration_min ? Number(form.duration_min) : 60,
        },
      });
      qc.invalidateQueries({ queryKey: ["sections", tripId] });
      setForm({ name: "", category: "sightseeing", cost: "", duration_min: "60" });
      setOpen(false);
      toast.success("Activity added");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Could not add activity");
    }
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
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Visit Senso-ji Temple" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {["sightseeing", "food", "adventure", "shopping", "nightlife", "relaxation", "transport"].map((c) => (
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
              <Label>Duration (min)</Label>
              <Input type="number" min="0" step="15" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} className="w-full">Add to itinerary</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
