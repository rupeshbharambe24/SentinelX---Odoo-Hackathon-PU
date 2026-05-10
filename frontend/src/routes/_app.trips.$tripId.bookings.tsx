import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CalendarCheck, MapPin, Plus, Trash2, Plane, Hotel, Train, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TripSubNav } from "@/components/trip-sub-nav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/trips/$tripId/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Traveloop" }] }),
  component: Bookings,
});

// Bookings are stored using trip_notes table with a "[BOOKING]" prefix convention
// since the bookings table doesn't exist yet — we use trip_notes as a workaround
type Booking = {
  id: string; trip_id: string; title: string; content: string | null;
  created_at: string; updated_at: string;
  // Parsed from content
  type: string; provider: string; confirmationCode: string;
  startDate: string; endDate: string; cost: string; notes: string;
};

function parseBooking(note: { id: string; trip_id: string; title: string; content: string | null; created_at: string; updated_at: string }): Booking | null {
  if (!note.title.startsWith("[BOOKING]")) return null;
  const data = (() => { try { return JSON.parse(note.content ?? "{}"); } catch { return {}; } })();
  return {
    ...note,
    title: note.title.replace("[BOOKING] ", ""),
    type: data.type ?? "hotel",
    provider: data.provider ?? "",
    confirmationCode: data.confirmationCode ?? "",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    cost: data.cost ?? "0",
    notes: data.notes ?? "",
  };
}

const BOOKING_TYPES = [
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "flight", label: "Flight", icon: Plane },
  { value: "transport", label: "Transport", icon: Train },
  { value: "ticket", label: "Ticket", icon: Ticket },
];

const typeIcon = (type: string) => {
  const found = BOOKING_TYPES.find((t) => t.value === type);
  return found?.icon ?? CalendarCheck;
};

function Bookings() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "hotel", provider: "", confirmationCode: "",
    startDate: "", endDate: "", cost: "", notes: "",
  });

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_notes").select("*").eq("trip_id", tripId).like("title", "[BOOKING]%").order("created_at");
      if (error) throw error;
      return (data ?? []).map(parseBooking).filter(Boolean) as Booking[];
    },
  });

  const addBooking = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("trip_notes").insert({
        trip_id: tripId,
        title: `[BOOKING] ${form.title.trim()}`,
        content: JSON.stringify({
          type: form.type, provider: form.provider.trim(),
          confirmationCode: form.confirmationCode.trim(),
          startDate: form.startDate, endDate: form.endDate,
          cost: form.cost, notes: form.notes.trim(),
        }),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tripId] });
      setForm({ title: "", type: "hotel", provider: "", confirmationCode: "", startDate: "", endDate: "", cost: "", notes: "" });
      setOpen(false);
      toast.success("Booking added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => { await supabase.from("trip_notes").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings", tripId] }); toast.success("Booking removed"); },
  });

  const totalCost = (bookings ?? []).reduce((sum, b) => sum + Number(b.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">{trip?.title ?? "Bookings"}</h1>
        {trip?.destination && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {trip.destination}</div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="text-xs text-muted-foreground">Total Bookings</div>
              <div className="mt-1 font-display text-2xl font-bold">{bookings?.length ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="mt-1 font-display text-2xl font-bold text-primary">${totalCost.toFixed(0)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft col-span-2 sm:col-span-1">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full h-full"><Plus className="mr-1 h-4 w-4" /> Add Booking</Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Add Booking</SheetTitle>
                    <SheetDescription>Track your reservations and tickets.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4 px-4">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Hilton Tokyo Bay, JAL Flight…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{BOOKING_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Provider / Airline</Label>
                      <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Hilton, JAL, Uber…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirmation Code</Label>
                      <Input value={form.confirmationCode} onChange={(e) => setForm({ ...form, confirmationCode: e.target.value })} placeholder="ABC123" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Check-in / Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>Check-out / End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cost (USD)</Label>
                      <Input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any extra info…" />
                    </div>
                    <Button onClick={() => addBooking.mutate()} className="w-full" disabled={!form.title.trim()}>Add booking</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Bookings List */}
          {(bookings ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No bookings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Track your hotels, flights, and tickets here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(bookings ?? []).map((b) => {
                const Icon = typeIcon(b.type);
                return (
                  <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft hover-lift group">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-base font-semibold">{b.title}</h3>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-[10px]">{BOOKING_TYPES.find((t) => t.value === b.type)?.label ?? b.type}</Badge>
                              {b.provider && <span>{b.provider}</span>}
                              {b.confirmationCode && <span className="font-mono text-primary">#{b.confirmationCode}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteBooking.mutate(b.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {b.startDate && <span>{format(new Date(b.startDate), "MMM d, yyyy")}{b.endDate && ` — ${format(new Date(b.endDate), "MMM d, yyyy")}`}</span>}
                          {Number(b.cost) > 0 && <span className="font-medium text-primary">${Number(b.cost).toFixed(0)}</span>}
                        </div>
                        {b.notes && <p className="mt-2 text-xs text-muted-foreground">{b.notes}</p>}
                      </div>
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
