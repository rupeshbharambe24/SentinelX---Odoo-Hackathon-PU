import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Wallet } from "lucide-react";
import { format } from "date-fns";

export type TripCardData = {
  id: string;
  name: string;
  description?: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number | null;
};

const FALLBACK =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80";

export function TripCard({ trip }: { trip: TripCardData }) {
  const dates =
    trip.start_date && trip.end_date
      ? `${format(new Date(trip.start_date), "MMM d")} – ${format(new Date(trip.end_date), "MMM d, yyyy")}`
      : "Dates TBD";

  return (
    <Link
      to="/trips/$tripId/overview"
      params={{ tripId: trip.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card hover-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={trip.cover_photo_url || FALLBACK}
          alt={trip.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-lg font-semibold text-white drop-shadow-md">
            {trip.name}
          </h3>
          {trip.description && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-white/85">
              <MapPin className="h-3 w-3" />
              {trip.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {dates}
        </div>
        {trip.total_budget ? (
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Wallet className="h-3 w-3" />${Number(trip.total_budget).toLocaleString()}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
