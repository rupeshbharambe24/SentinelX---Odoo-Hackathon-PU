import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Mail, MapPin, Pencil, Phone, Save, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TripCard } from "@/components/trip-card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Traveloop" }] }),
  component: Profile,
});

const EXPLORATION_STYLES = ["Relaxed", "Adventurous", "Cultural", "Foodie", "Budget", "Luxury"];
const DESTINATION_PREFS = ["Beach", "Mountains", "City", "Countryside", "Desert", "Arctic", "Islands", "Jungle"];

interface Trip {
  id: string;
  name: string;
  description: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number | null;
  status: "ongoing" | "upcoming" | "completed" | "draft";
}

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", "all", user?.id],
    enabled: !!user,
    queryFn: () => api<Trip[]>("/trips", { query: { sort: "-start_date" } }),
  });

  const preplanned = (trips ?? []).filter((t) => t.status !== "completed");
  const previous = (trips ?? []).filter((t) => t.status === "completed");

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const initials = (fullName || user?.email || "U").slice(0, 2).toUpperCase();
  const f = (key: string) => form[key] ?? (user as Record<string, unknown> | null)?.[key] ?? "";
  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api("/users/me/profile", {
        method: "PUT",
        body: {
          first_name: (form.first_name ?? user.first_name ?? "").trim() || user.first_name,
          last_name: (form.last_name ?? user.last_name ?? "").trim() || user.last_name,
          phone: (form.phone ?? user.phone ?? "").trim() || null,
          city: (form.city ?? user.city ?? "").trim() || null,
          country: (form.country ?? user.country ?? "").trim() || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setEditing(false);
      setForm({});
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 border-4 border-white/20">
            <AvatarFallback className="bg-white/20 text-2xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">{fullName || "Traveler"}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/85">
              {user?.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user.email}</span>}
              {user?.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {user.phone}</span>}
              {(user?.city || user?.country) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[user.city, user.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
              <div className="font-display text-2xl font-bold">{preplanned.length}</div>
              <div className="text-xs text-white/70">Preplanned</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
              <div className="font-display text-2xl font-bold">{previous.length}</div>
              <div className="text-xs text-white/70">Previous</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Profile Details</h2>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm({}); }}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input value={f("first_name") as string} onChange={(e) => set("first_name", e.target.value)} disabled={!editing} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input value={f("last_name") as string} onChange={(e) => set("last_name", e.target.value)} disabled={!editing} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f("phone") as string} onChange={(e) => set("phone", e.target.value)} disabled={!editing} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={f("city") as string} onChange={(e) => set("city", e.target.value)} disabled={!editing} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={f("country") as string} onChange={(e) => set("country", e.target.value)} disabled={!editing} placeholder="Optional" />
          </div>
        </div>
      </section>

      {/* Travel Preferences */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 font-display text-xl font-semibold">Travel Preferences</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Exploration Style</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPLORATION_STYLES.map((style) => (
                <Badge key={style} variant="secondary" className="cursor-pointer px-3 py-1.5 text-xs hover:bg-primary hover:text-primary-foreground transition-base">{style}</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Destination Preferences</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DESTINATION_PREFS.map((pref) => (
                <Badge key={pref} variant="outline" className="cursor-pointer px-3 py-1.5 text-xs hover:bg-primary hover:text-primary-foreground transition-base">{pref}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Preplanned trips</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : preplanned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming trips.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preplanned.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Previous trips</h2>
        {previous.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your travel history will appear here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previous.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
