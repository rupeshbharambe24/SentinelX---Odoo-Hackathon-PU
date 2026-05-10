import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Compass, Map as MapIcon, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
            <Compass className="h-4 w-4" />
          </span>
          Traveloop
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary shadow-soft">
                <Sparkles className="h-3 w-3" /> AI-assisted itineraries
              </div>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Plan multi-city trips that actually{" "}
                <span className="text-primary">flow.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Map every stop, budget every day, and pack smarter. Traveloop turns the chaos of group
                travel into a calm, shareable plan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="shadow-soft">
                  <Link to="/register">
                    Start planning <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">I already have an account</Link>
                </Button>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                {[
                  { icon: MapIcon, label: "Multi-city" },
                  { icon: Wallet, label: "Budget tracking" },
                  { icon: Sparkles, label: "AI suggestions" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-xl border border-border bg-card p-3 text-center shadow-soft"
                  >
                    <f.icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                    <div className="text-xs font-medium">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-hero opacity-20 blur-3xl" />
              <img
                src="https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1200&q=80"
                alt="Travel planning"
                className="relative aspect-[4/3] max-h-[480px] w-full rounded-3xl object-cover shadow-card"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
