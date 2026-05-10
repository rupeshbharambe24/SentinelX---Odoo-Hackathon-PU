import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Plus, StickyNote, Trash2, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { TripSubNav } from "@/components/trip-sub-nav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/trips/$tripId/notes")({
  head: () => ({ meta: [{ title: "Trip Notes — Traveloop" }] }),
  component: TripNotes,
});

type Note = { id: string; trip_id: string; title: string; content: string | null; created_at: string; updated_at: string };

function TripNotes() {
  const { tripId } = Route.useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_notes").select("*").eq("trip_id", tripId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim()) throw new Error("Title required");
      if (editId) {
        const { error } = await supabase.from("trip_notes").update({ title: formTitle.trim(), content: formContent.trim() || null }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_notes").insert({ trip_id: tripId, title: formTitle.trim(), content: formContent.trim() || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", tripId] });
      resetForm();
      toast.success(editId ? "Note updated" : "Note created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => { await supabase.from("trip_notes").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes", tripId] }); toast.success("Note deleted"); },
  });

  const resetForm = () => { setShowForm(false); setEditId(null); setFormTitle(""); setFormContent(""); };

  const startEdit = (note: Note) => {
    setEditId(note.id); setFormTitle(note.title); setFormContent(note.content ?? ""); setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/trips"><ArrowLeft className="mr-1 h-4 w-4" /> All trips</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">{trip?.title ?? "Trip Notes"}</h1>
        {trip?.destination && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {trip.destination}</div>
        )}
      </div>

      <TripSubNav tripId={tripId} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          {/* Add/Edit Form */}
          {showForm ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold">{editId ? "Edit Note" : "New Note"}</h3>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7"><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Hotel check-in info, restaurant picks…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={5} placeholder="Write your notes here…" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveNote.mutate()} disabled={!formTitle.trim()}>
                  <Save className="mr-1 h-4 w-4" /> {editId ? "Update" : "Save"}
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)} variant="outline" size="lg" className="w-full border-dashed py-8 text-muted-foreground hover:text-primary">
              <Plus className="mr-2 h-4 w-4" /> Add a note
            </Button>
          )}

          {/* Notes List */}
          {(notes ?? []).length === 0 && !showForm ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <StickyNote className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">No notes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Jot down important info for your trip.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(notes ?? []).map((note) => (
                <div key={note.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft hover-lift group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base font-semibold truncate">{note.title}</h3>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        Updated {format(new Date(note.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-base">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(note)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteNote.mutate(note.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {note.content && (
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
