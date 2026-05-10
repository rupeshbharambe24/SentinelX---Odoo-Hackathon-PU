import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Loader2, Shield, BarChart3, Users, MapPin, Sparkles, TrendingUp, Activity,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — Traveloop" }] }),
  component: AdminLayout,
});

const items = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/cities", label: "Popular destinations", icon: MapPin },
  { to: "/admin/activities", label: "Popular activities", icon: Sparkles },
  { to: "/admin/trends", label: "Trends", icon: TrendingUp },
  { to: "/admin/recent", label: "Recent activity", icon: Activity },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!user.is_admin) navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading || !user || !user.is_admin) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Distinct admin header — destructive accent so it's obvious you're not in user mode */}
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-soft">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Admin Portal</h1>
            <Badge variant="destructive" className="text-[10px]">admin only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform-wide controls and analytics · signed in as {user.email}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        {/* Sidebar */}
        <aside>
          <nav className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-soft">
            {items.map((it) => {
              const active = it.exact
                ? path === it.to || path === it.to + "/"
                : path === it.to || path.startsWith(it.to + "/");
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-base ${
                    active
                      ? "bg-gradient-hero text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Active sub-page */}
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
