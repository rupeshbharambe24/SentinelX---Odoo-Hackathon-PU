import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, MessageCircle, Share2, MapPin, Bookmark, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
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

function Community() {
  const qc = useQueryClient();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community", "posts"],
    queryFn: () => api<Post[]>("/community/posts"),
  });

  const createPost = useMutation({
    mutationFn: () =>
      api<Post>("/community/posts", {
        method: "POST",
        body: { title: newTitle.trim() },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
      setNewTitle("");
      toast.success("Posted!");
    },
    onError: (e: ApiError) => toast.error(e.detail),
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) =>
      api<{ liked: boolean; likes_count: number }>(`/community/posts/${postId}/like`, { method: "POST" }),
    onSuccess: (resp, postId) => {
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
      setLiked((prev) => {
        const next = new Set(prev);
        if (resp.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    },
  });

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Community</h1>
        <p className="text-sm text-muted-foreground">Stories and inspiration from fellow travelers.</p>
      </div>

      {/* Create Post */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10"><AvatarFallback>YOU</AvatarFallback></Avatar>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Share your travel story…"
              className="flex-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && createPost.mutate()}
            />
            <Button onClick={() => createPost.mutate()} disabled={!newTitle.trim() || createPost.isPending}>
              <Send className="mr-1 h-4 w-4" /> Post
            </Button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="mx-auto max-w-2xl space-y-6">
        {isLoading
          ? [0, 1].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
          : (posts ?? []).map((post) => {
              const isLiked = liked.has(post.id);
              const isSaved = saved.has(post.id);
              const initials = (post.user_name ?? "?").slice(0, 2).toUpperCase();
              const time = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
              const cover = post.images?.[0];
              return (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  {/* Author Header */}
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{post.user_name ?? "Anonymous"}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {post.city_id && <MapPin className="h-3 w-3" />}
                        {time}
                      </div>
                    </div>
                  </div>

                  {/* Image (if any) */}
                  {cover && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={cover} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-9 w-9"
                          onClick={() => likeMutation.mutate(post.id)}
                        >
                          <Heart className={`h-5 w-5 transition-colors ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-9 w-9"
                        onClick={() => toggleSave(post.id)}
                      >
                        <Bookmark className={`h-5 w-5 transition-colors ${isSaved ? "fill-primary text-primary" : ""}`} />
                      </Button>
                    </div>

                    <div className="text-sm font-medium">{post.likes_count} likes</div>

                    <div>
                      <p className="text-sm">
                        <span className="font-semibold mr-1">{post.user_name ?? "Anonymous"}</span>
                        <span className="font-medium">{post.title}</span>
                      </p>
                      {post.content && <p className="mt-1 text-sm whitespace-pre-wrap">{post.content}</p>}
                    </div>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {post.comments_count > 0 && (
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        View all {post.comments_count} comments
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

        {!isLoading && posts && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <h3 className="font-display text-lg font-semibold">No stories yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to share your travel story.</p>
          </div>
        )}
      </div>
    </div>
  );
}
