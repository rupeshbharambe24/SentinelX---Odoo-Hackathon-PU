import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Heart, MessageCircle, Share2, MapPin, Bookmark, Send, Sparkles,
  Search, X, ImageIcon, Tag as TagIcon, Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/community")({
  head: () => ({ meta: [{ title: "Community — Traveloop" }] }),
  component: Community,
});

interface Post {
  id: string;
  user_id: string;
  user_name: string | null;
  title: string;
  content: string | null;
  images: string[] | null;
  tags: string[] | null;
  city_id: number | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string | null;
  content: string | null;
  created_at: string;
}

interface Trip {
  id: string;
  name: string;
}

type Sort = "-created_at" | "-likes_count";

function Community() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("-created_at");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community", "posts", search, sort, tagFilter],
    queryFn: () =>
      api<Post[]>("/community/posts", {
        query: {
          search: search.trim() || undefined,
          sort,
          tag: tagFilter || undefined,
        },
      }),
  });

  // Aggregate tag chips from the current page
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of posts ?? []) {
      for (const t of p.tags ?? []) counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [posts]);

  const initials = (user?.first_name || user?.email || "U").slice(0, 2).toUpperCase();
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.email || "You";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Community</h1>
          <p className="text-sm text-muted-foreground">Stories and inspiration from fellow travelers.</p>
        </div>
      </div>

      {/* Composer prompt + sort + search */}
      <div className="grid gap-3 sm:grid-cols-[1fr,auto] sm:items-center">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <ComposerSheet displayName={displayName}>
              <button className="flex-1 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/60 transition-base">
                Share your travel story…
              </button>
            </ComposerSheet>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_at">Most recent</SelectItem>
              <SelectItem value="-likes_count">Most liked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stories…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tag filter chips */}
      {tagCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={tagFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => setTagFilter(null)}
          >
            All
          </Button>
          {tagCounts.map(([t, n]) => (
            <Button
              key={t}
              variant={tagFilter === t ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-full text-xs"
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            >
              <TagIcon className="mr-1 h-3 w-3" />
              {t}
              <span className="ml-1 opacity-60">×{n}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="mx-auto max-w-2xl space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </>
        ) : (posts ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">
              {search || tagFilter ? "No matching stories" : "Be the first to share"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || tagFilter ? "Try a different search or tag." : "Tell the community about your last trip."}
            </p>
          </div>
        ) : (
          (posts ?? []).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLikeOptimistic={(liked) => {
                qc.setQueryData<Post[]>(
                  ["community", "posts", search, sort, tagFilter],
                  (old) => (old ?? []).map((p) =>
                    p.id === post.id
                      ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1) }
                      : p,
                  ),
                );
              }}
              onTagClick={(t) => setTagFilter(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onLikeOptimistic,
  onTagClick,
}: {
  post: Post;
  onLikeOptimistic: (liked: boolean) => void;
  onTagClick: (tag: string) => void;
}) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = (post.user_name ?? "?").slice(0, 2).toUpperCase();
  const time = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const cover = post.images?.[0];

  const likeMutation = useMutation({
    mutationFn: () =>
      api<{ liked: boolean; likes_count: number }>(`/community/posts/${post.id}/like`, { method: "POST" }),
    onSuccess: (resp) => {
      setLiked(resp.liked);
      onLikeOptimistic(resp.liked);
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
    },
  });

  const sharePost = () => {
    const url = `${window.location.origin}/community#post-${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.content ?? "", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  return (
    <article id={`post-${post.id}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {/* Author header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{post.user_name ?? "Anonymous"}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Image hero */}
      {cover && (
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img src={cover} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      {post.images && post.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-muted/30 px-4 py-2">
          {post.images.slice(1).map((img, i) => (
            <img key={i} src={img} alt="" className="h-16 w-24 shrink-0 rounded object-cover" loading="lazy" />
          ))}
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => likeMutation.mutate()}>
              <Heart className={`h-5 w-5 transition-colors ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowComments((s) => !s)}>
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={sharePost}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSaved((s) => !s)}>
            <Bookmark className={`h-5 w-5 transition-colors ${saved ? "fill-primary text-primary" : ""}`} />
          </Button>
        </div>

        <div className="text-sm font-medium">{post.likes_count} likes</div>

        <div>
          <p className="text-sm">
            <span className="font-semibold mr-1">{post.user_name ?? "Anonymous"}</span>
            <span className="font-medium">{post.title}</span>
          </p>
          {post.content && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <button
                key={t}
                onClick={() => onTagClick(t)}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground transition-base hover:bg-primary hover:text-primary-foreground"
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Comments toggle */}
        {post.comments_count > 0 && !showComments && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowComments(true)}
          >
            View all {post.comments_count} comment{post.comments_count === 1 ? "" : "s"}
          </button>
        )}

        {showComments && <CommentsThread postId={post.id} />}
      </div>
    </article>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsThread({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["community", "comments", postId],
    queryFn: () => api<Comment[]>(`/community/posts/${postId}/comments`),
  });

  const submit = useMutation({
    mutationFn: () =>
      api<Comment>(`/community/posts/${postId}/comments`, {
        method: "POST",
        body: { content: draft.trim() },
      }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["community", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {isLoading ? (
        <Skeleton className="h-8 rounded" />
      ) : (
        (comments ?? []).map((c) => (
          <div key={c.id} className="flex gap-2.5 text-sm">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-muted text-[10px]">
                {(c.user_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div>
                <span className="font-semibold mr-1">{c.user_name ?? "Anonymous"}</span>
                <span className="text-muted-foreground">{c.content}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && submit.mutate()}
        />
        <Button size="sm" disabled={!draft.trim() || submit.isPending} onClick={() => submit.mutate()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function ComposerSheet({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    images: "",
    tags: "",
    trip_id: "",
  });

  const { data: trips } = useQuery({
    queryKey: ["trips", "for-composer"],
    queryFn: () => api<Trip[]>("/trips"),
    enabled: open,
  });

  const createPost = useMutation({
    mutationFn: () => {
      const images = form.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = form.tags
        .split(",")
        .map((s) => s.trim().replace(/^#/, ""))
        .filter(Boolean);
      return api("/community/posts", {
        method: "POST",
        body: {
          title: form.title.trim(),
          content: form.content.trim() || null,
          images: images.length > 0 ? images : null,
          tags: tags.length > 0 ? tags : null,
          trip_id: form.trip_id || null,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
      setOpen(false);
      setForm({ title: "", content: "", images: "", tags: "", trip_id: "" });
      toast.success("Posted!");
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Share your travel story</SheetTitle>
          <SheetDescription>Posting as {displayName}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 px-4 pb-8">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Headline</label>
            <Input
              placeholder="Found a hidden gem in Kyoto"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Story</label>
            <Textarea
              rows={5}
              placeholder="Sunrise at Arashiyama. Barely anyone around. Pro tip: take the first bus from Kyoto Station…"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <ImageIcon className="h-3 w-3" /> Image URL(s)
            </label>
            <Input
              placeholder="https://images.unsplash.com/… , https://…"
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">
              Comma-separated. The first image shows as the cover.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <TagIcon className="h-3 w-3" /> Tags
            </label>
            <Input
              placeholder="japan, sunset, photography"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <Plane className="h-3 w-3" /> Link to a trip (optional)
            </label>
            <Select
              value={form.trip_id || "_none"}
              onValueChange={(v) => setForm({ ...form, trip_id: v === "_none" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Don't link a trip" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Don't link a trip</SelectItem>
                {(trips ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live preview */}
          {(form.title || form.content || form.images) && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
              {form.images && form.images.split(",")[0]?.trim() && (
                <img
                  src={form.images.split(",")[0].trim()}
                  alt=""
                  className="mb-2 aspect-[16/10] w-full rounded-lg object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              )}
              {form.title && <p className="text-sm font-semibold">{form.title}</p>}
              {form.content && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{form.content}</p>}
              {form.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createPost.mutate()}
              disabled={!form.title.trim() || createPost.isPending}
            >
              <Send className="mr-1 h-4 w-4" />
              {createPost.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

