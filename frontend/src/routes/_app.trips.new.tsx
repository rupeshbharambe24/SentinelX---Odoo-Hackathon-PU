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
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trips/new")({
  head: () => ({ meta: [{ title: "Plan a Trip — Traveloop" }] }),
  component: NewTrip,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Required").max(200),
    destination: z.string().trim().max(200).optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    cover_photo_url: z
      .string()
      .trim()
      .url("Must be a URL")
      .max(500)
      .optional()
      .or(z.literal("")),
    start_date: z.string().min(1, "Required"),
    end_date: z.string().min(1, "Required"),
    total_budget: z.coerce.number().min(0).max(1_000_000).optional(),
    interests: z.string().max(200).optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    path: ["end_date"],
    message: "End date must be on or after start date",
  });
type FormData = z.infer<typeof schema>;

const COVERS = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&q=80",
];

interface TripResponse {
  id: string;
  user_id: string;
  name: string;
}

interface AISection {
  title: string;
  start_day: number;
  end_day: number;
  budget: number;
  activities: { name: string; category: string; cost: number; duration_min: number; description: string }[];
}

interface ItineraryResponse {
  sections: AISection[];
  total_estimated_cost: number;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function NewTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cover_photo_url: COVERS[0] },
  });

  const cover = watch("cover_photo_url");

  const createTrip = async (data: FormData): Promise<TripResponse> =>
    api<TripResponse>("/trips", {
      method: "POST",
      body: {
        name: data.name,
        description:
          [data.destination, data.description].filter(Boolean).join(" — ") || null,
        start_date: data.start_date,
        end_date: data.end_date,
        cover_photo_url: data.cover_photo_url || COVERS[0],
        total_budget: data.total_budget ?? 0,
      },
    });

  const submit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const trip = await createTrip(data);
      toast.success("Trip created!");
      navigate({ to: "/trips/$tripId/builder", params: { tripId: trip.id } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Could not create trip");
    } finally {
      setSubmitting(false);
    }
  };

  const suggestWithAI = async () => {
    if (!user) return;
    const data = getValues();
    if (!data.destination || !data.start_date || !data.end_date || !data.name) {
      toast.error("Fill in name, destination, and dates first");
      return;
    }
    setSuggesting(true);
    try {
      const days = daysBetween(data.start_date, data.end_date);
      const interests = (data.interests ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // 1. Generate the AI itinerary
      const ai = await api<ItineraryResponse>("/ai/generate-itinerary", {
        method: "POST",
        body: {
          destination: data.destination,
          days,
          interests,
          budget_usd: data.total_budget ?? 1000,
        },
      });
      // 2. Create the trip
      const trip = await createTrip(data);
      // 3. Materialise sections + activities
      const start = new Date(data.start_date);
      for (const s of ai.sections) {
        const sectionStart = new Date(start);
        sectionStart.setDate(start.getDate() + (s.start_day - 1));
        const sectionEnd = new Date(start);
        sectionEnd.setDate(start.getDate() + (s.end_day - 1));
        const section = await api<{ id: string }>("/sections", {
          method: "POST",
          body: {
            trip_id: trip.id,
            title: s.title,
            start_date: sectionStart.toISOString().slice(0, 10),
            end_date: sectionEnd.toISOString().slice(0, 10),
            section_budget: s.budget,
          },
        });
        for (const a of s.activities) {
          await api("/activities", {
            method: "POST",
            body: {
              section_id: section.id,
              name: a.name,
              category: a.category,
              cost: a.cost,
              duration_min: a.duration_min,
              notes: a.description,
            },
          });
        }
      }
      toast.success(`AI built ${ai.sections.length} sections — opening the builder…`);
      navigate({ to: "/trips/$tripId/builder", params: { tripId: trip.id } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "AI suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Plan a new trip</h1>
        <p className="text-sm text-muted-foreground">Set the basics — you can add stops next, or have AI scaffold the itinerary.</p>
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
              onClick={() => setValue("cover_photo_url", c, { shouldDirty: true })}
              className={`h-12 w-20 overflow-hidden rounded-md border-2 transition-base ${
                cover === c ? "border-primary shadow-soft" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={c} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Trip name</Label>
          <Input id="name" placeholder="Southeast Asia adventure" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destination">Primary destination</Label>
          <Input id="destination" placeholder="Bangkok, Bali, Tokyo…" {...register("destination")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
            {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
            {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total_budget">Budget (USD)</Label>
            <Input id="total_budget" type="number" min="0" step="50" placeholder="2500" {...register("total_budget")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="interests">Interests (comma-separated, used by AI)</Label>
          <Input id="interests" placeholder="art, food, hiking" {...register("interests")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Notes</Label>
          <Textarea id="description" rows={3} placeholder="What's the vibe?" {...register("description")} />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={submitting || suggesting} className="shadow-soft">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create trip"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting || suggesting}
            onClick={suggestWithAI}
          >
            {suggesting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Suggest with AI
          </Button>
        </div>
      </form>
    </div>
  );
}
