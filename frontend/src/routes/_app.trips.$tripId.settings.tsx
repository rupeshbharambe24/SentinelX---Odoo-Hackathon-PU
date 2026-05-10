import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TripSubNav } from "@/components/trip-sub-nav";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/$tripId/settings")({
  head: () => ({ meta: [{ title: "Trip Settings — Traveloop" }] }),
  component: TripSettings,
});

const COVERS = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
];

function TripSettings() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () =>
      api<{
        id: string;
        name: string;
        description: string | null;
        cover_photo_url: string | null;
        start_date: string | null;
        end_date: string | null;
        total_budget: number | null;
      }>(`/trips/${tripId}`),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  // Initialize form when trip loads
  const f = (key: string) => form[key] ?? (trip as Record<string, unknown>)?.[key] ?? "";
  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/trips/${tripId}`, {
        method: "PUT",
        body: {
          name: (form.name ?? trip?.name ?? "").trim() || trip?.name,
          description: (form.description ?? trip?.description ?? "").trim() || null,
          cover_photo_url: form.cover_photo_url ?? trip?.cover_photo_url,
          start_date: (form.start_date ?? trip?.start_date ?? "") || null,
          end_date: (form.end_date ?? trip?.end_date ?? "") || null,
          total_budget:
            form.total_budget !== undefined
              ? Number(form.total_budget) || 0
              : trip?.total_budget ?? 0,
        },
      });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip updated!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = useMutation({
    mutationFn: () => api(`/trips/${tripId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Trip deleted");
      navigate({ to: "/trips" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCover = f("cover_photo_url") as string;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Trip Settings</h1>
        {trip?.description && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {trip.description}</div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="space-y-6">
          {/* Edit Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
            <h2 className="font-display text-lg font-semibold">General Information</h2>

            {/* Cover preview */}
            <div className="aspect-[3/1] overflow-hidden rounded-xl">
              <img src={selectedCover || COVERS[0]} alt="Cover" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-wrap gap-2">
              {COVERS.map((c) => (
                <button key={c} type="button" onClick={() => set("cover_photo_url", c)}
                  className={`h-12 w-20 overflow-hidden rounded-md border-2 transition-base ${selectedCover === c ? "border-primary shadow-soft" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <img src={c} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Trip name</Label>
              <Input id="name" value={f("name") as string} onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start date</Label>
                <Input id="start_date" type="date" value={f("start_date") as string} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">End date</Label>
                <Input id="end_date" type="date" value={f("end_date") as string} onChange={(e) => set("end_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total_budget">Budget (USD)</Label>
                <Input id="total_budget" type="number" min="0" step="50" value={f("total_budget") as string} onChange={(e) => set("total_budget", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Notes / Description</Label>
              <Textarea id="description" rows={3} value={f("description") as string} onChange={(e) => set("description", e.target.value)} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="shadow-soft">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save changes
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">Deleting this trip will permanently remove all sections, activities, packing items, notes, and bookings.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-1 h-4 w-4" /> Delete trip</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone. All data for "{trip?.name}" will be permanently deleted.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTrip.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete forever</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
