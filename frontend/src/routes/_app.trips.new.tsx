import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/new")({
  head: () => ({ meta: [{ title: "Plan a Trip — Traveloop" }] }),
  component: NewTrip,
});

const schema = z.object({
  title: z.string().trim().min(2, "Required").max(120),
  destination: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  cover_image: z.string().trim().url("Must be a URL").max(500).optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  budget: z.coerce.number().min(0).max(1_000_000).optional(),
});
type FormData = z.infer<typeof schema>;

const COVERS = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&q=80",
];

function NewTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cover_image: COVERS[0] },
  });

  const cover = watch("cover_image");

  const submit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        title: data.title,
        destination: data.destination || null,
        description: data.description || null,
        cover_image: data.cover_image || COVERS[0],
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        budget: data.budget ?? 0,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error || !trip) {
      toast.error(error?.message ?? "Could not create trip");
      return;
    }
    toast.success("Trip created!");
    navigate({ to: "/trips/$tripId/builder", params: { tripId: trip.id } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Plan a new trip</h1>
        <p className="text-sm text-muted-foreground">Set the basics — you can add stops next.</p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="aspect-[3/1] overflow-hidden rounded-xl">
          <img src={cover || COVERS[0]} alt="Cover" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-wrap gap-2">
          {COVERS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setValue("cover_image", c, { shouldDirty: true })}
              className={`h-12 w-20 overflow-hidden rounded-md border-2 transition-base ${
                cover === c ? "border-primary shadow-soft" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={c} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Trip title</Label>
          <Input id="title" placeholder="Southeast Asia adventure" {...register("title")} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destination">Primary destination</Label>
          <Input id="destination" placeholder="Bangkok, Bali, Tokyo…" {...register("destination")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget (USD)</Label>
            <Input id="budget" type="number" min="0" step="50" placeholder="2500" {...register("budget")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Notes</Label>
          <Textarea id="description" rows={3} placeholder="What's the vibe?" {...register("description")} />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={submitting} className="shadow-soft">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create trip"}
          </Button>
          <Button type="button" variant="outline" disabled>
            <Sparkles className="mr-1 h-4 w-4" /> Suggest with AI
          </Button>
        </div>
      </form>
    </div>
  );
}
