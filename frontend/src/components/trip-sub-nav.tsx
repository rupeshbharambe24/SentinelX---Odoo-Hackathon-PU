import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Hammer, Eye, Wallet, Package, StickyNote, Settings, FileText
} from "lucide-react";

const items = [
  { to: "/trips/$tripId/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/trips/$tripId/builder", label: "Builder", icon: Hammer },
  { to: "/trips/$tripId/itinerary", label: "Itinerary", icon: Eye },
  { to: "/trips/$tripId/budget", label: "Budget", icon: Wallet },
  { to: "/trips/$tripId/packing", label: "Packing", icon: Package },
  { to: "/trips/$tripId/notes", label: "Notes", icon: StickyNote },
  { to: "/trips/$tripId/invoice", label: "Invoice", icon: FileText },
  { to: "/trips/$tripId/settings", label: "Settings", icon: Settings },
] as const;

export function TripSubNav({ tripId }: { tripId: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="mb-6 -mx-1 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5 shadow-soft">
      {items.map((item) => {
        const href = item.to.replace("$tripId", tripId);
        const active = path.endsWith(href.split("/").pop()!);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            params={{ tripId }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-base ${
              active
                ? "bg-gradient-hero text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
