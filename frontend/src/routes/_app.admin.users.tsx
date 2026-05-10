import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Shield, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin — Traveloop" }] }),
  component: AdminUsers,
});

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  trip_count: number;
  last_active: string | null;
  is_admin: boolean;
  created_at: string;
}

function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<UserRow[]>("/admin/users"),
  });

  const users = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`
        .trim()
        .toLowerCase();
      return u.email.toLowerCase().includes(q) || fullName.includes(q);
    });
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading users…"
            : `${users.length} user${users.length === 1 ? "" : "s"} registered`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="pl-9"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Trips
                </TableHead>
                <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Admin
                </TableHead>
                <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Last active
                </TableHead>
                <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Joined
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Skeleton className="ml-auto h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No matching users.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const fullName =
                    [u.first_name, u.last_name].filter(Boolean).join(" ") || "";
                  return (
                    <TableRow
                      key={u.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-base"
                    >
                      <TableCell className="px-4 py-2.5 font-mono text-xs">
                        {u.email}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {fullName ? (
                          fullName
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right font-medium text-base">
                        {u.trip_count}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {u.is_admin ? (
                          <Badge
                            variant="destructive"
                            className="inline-flex items-center gap-1 text-[10px]"
                          >
                            <Shield className="h-3 w-3" />
                            admin
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground">
                        {u.last_active
                          ? formatDistanceToNow(new Date(u.last_active), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
