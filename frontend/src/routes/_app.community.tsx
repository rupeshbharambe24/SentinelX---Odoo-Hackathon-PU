import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Share2, MapPin, Bookmark, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/community")({
  head: () => ({ meta: [{ title: "Community — Traveloop" }] }),
  component: Community,
});

type Post = {
  id: string; author: string; avatar: string; location: string; date: string;
  image: string; caption: string; likes: number; comments: number;
  tags: string[];
};

const POSTS: Post[] = [
  {
    id: "1", author: "Sarah Chen", avatar: "SC", location: "Kyoto, Japan", date: "2h ago",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    caption: "Found the most serene bamboo grove in Arashiyama. Arriving at sunrise made all the difference — barely anyone around. The light filtering through the stalks was absolutely magical. 🎋",
    likes: 234, comments: 18, tags: ["Japan", "Nature", "Photography"],
  },
  {
    id: "2", author: "Marco Rossi", avatar: "MR", location: "Santorini, Greece", date: "5h ago",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    caption: "Blue domes at sunset — the most photographed spot in Oia but somehow it still takes your breath away every single time. Pro tip: book dinner at the restaurant below for the best view without the crowd.",
    likes: 512, comments: 42, tags: ["Greece", "Sunset", "Islands"],
  },
  {
    id: "3", author: "Priya Patel", avatar: "PP", location: "Marrakech, Morocco", date: "1d ago",
    image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80",
    caption: "The spice market in the medina is an absolute sensory overload — in the best possible way. Bargaining is an art form here. Got the most beautiful hand-painted ceramics for a fraction of mall prices.",
    likes: 178, comments: 23, tags: ["Morocco", "Culture", "Food"],
  },
  {
    id: "4", author: "James Wright", avatar: "JW", location: "Reykjavik, Iceland", date: "2d ago",
    image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80",
    caption: "Northern lights finally showed up on our last night! After 4 nights of cloud cover, the sky just opened up and put on the most incredible show. Patience pays off when you're chasing the aurora. 🌌",
    likes: 891, comments: 67, tags: ["Iceland", "Adventure", "Nature"],
  },
  {
    id: "5", author: "Luna Kim", avatar: "LK", location: "Lisbon, Portugal", date: "3d ago",
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
    caption: "Spent the afternoon riding Tram 28 through the Alfama district. The narrow streets, the tiles on every building, the laundry hanging from windows — Lisbon has the most charming soul of any European city I've visited.",
    likes: 345, comments: 31, tags: ["Portugal", "Culture", "City"],
  },
  {
    id: "6", author: "Aiden Brooks", avatar: "AB", location: "Queenstown, NZ", date: "4d ago",
    image: "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=800&q=80",
    caption: "Bungee jumped off the Kawarau Bridge today — 43 meters of pure adrenaline! The view of the canyon and turquoise river below is stunning even when you're screaming your head off. 10/10 would do again.",
    likes: 456, comments: 38, tags: ["NewZealand", "Adventure", "Adrenaline"],
  },
];

function Community() {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
            <Input placeholder="Share your travel story…" className="flex-1" />
            <Button><Send className="mr-1 h-4 w-4" /> Post</Button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="mx-auto max-w-2xl space-y-6">
        {POSTS.map((post) => {
          const isLiked = liked.has(post.id);
          const isSaved = saved.has(post.id);
          return (
            <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              {/* Author Header */}
              <div className="flex items-center gap-3 p-4 pb-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xs font-bold">{post.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{post.author}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {post.location} · {post.date}
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="aspect-[16/10] overflow-hidden">
                <img src={post.image} alt={post.location} className="h-full w-full object-cover" loading="lazy" />
              </div>

              {/* Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-9 w-9"
                      onClick={() => toggleLike(post.id)}
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

                <div className="text-sm font-medium">{post.likes + (isLiked ? 1 : 0)} likes</div>

                <p className="text-sm">
                  <span className="font-semibold mr-1">{post.author}</span>
                  {post.caption}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>
                  ))}
                </div>

                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all {post.comments} comments
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
