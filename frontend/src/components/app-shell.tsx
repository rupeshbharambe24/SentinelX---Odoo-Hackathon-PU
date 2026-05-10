import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Compass, Globe, LayoutDashboard, LogOut, Map, Shield, Users, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/explore", label: "Explore", icon: Globe, adminOnly: false },
  { to: "/trips", label: "My Trips", icon: Map, adminOnly: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: false },
  { to: "/community", label: "Community", icon: Users, adminOnly: false },
  { to: "/profile", label: "Profile", icon: UserIcon, adminOnly: false },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const visibleNav = nav.filter((n) => !n.adminOnly || user?.is_admin);

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
              <Compass className="h-4 w-4" />
            </span>
            <span>Traveloop</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {visibleNav.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-base ${
                    n.adminOnly
                      ? active
                        ? "bg-destructive/15 text-destructive"
                        : "text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      : active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {n.adminOnly && <Shield className="h-3.5 w-3.5" />}
                  {n.label}
                  {n.adminOnly && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">
                      admin
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {visibleNav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  n.adminOnly
                    ? active
                      ? "bg-destructive/15 text-destructive"
                      : "text-destructive/70"
                    : active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
