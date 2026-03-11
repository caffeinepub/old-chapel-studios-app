import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENT_USER,
  DAYS,
  INITIAL_AVAILABILITY,
  type Post,
  ROLE_COLORS,
  ROLE_LABELS,
  ROOMS,
  formatRelativeTime,
  getUserById,
} from "@/data/mockData";
import { Hash, MessageCircle, Paperclip, Pin, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const REACTIONS = ["👍", "❤️", "🎵", "🔥"];

const STATUS_COLORS = {
  available: "#22C55E",
  booked: "#FF4500",
  partial: "#FFA500",
  closed: "oklch(0.28 0.015 45)",
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    hashtags: "",
    isAnnouncement: false,
  });

  const handleReact = (postId: string, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                [emoji]: (p.reactions[emoji] || 0) + 1,
              },
            }
          : p,
      ),
    );
  };

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    const post: Post = {
      id: `post-${Date.now()}`,
      authorId: CURRENT_USER.id,
      title: newPost.title,
      content: newPost.content,
      hashtags: newPost.hashtags
        .split(/[,\s]+/)
        .map((h) => h.replace("#", "").trim())
        .filter(Boolean),
      pinned: false,
      isAnnouncement: newPost.isAnnouncement,
      timestamp: new Date().toISOString(),
      reactions: { "👍": 0, "❤️": 0, "🎵": 0, "🔥": 0 },
      commentCount: 0,
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost({ title: "", content: "", hashtags: "", isAnnouncement: false });
    setShowCreatePost(false);
  };

  // Sort: pinned first
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Old Chapel Studios" notificationCount={3} />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Availability Widget */}
          <div
            className="mx-4 mt-4 rounded-xl p-4 border"
            style={{
              backgroundColor: "oklch(0.17 0.01 45)",
              borderColor: "oklch(0.28 0.015 45)",
            }}
            data-ocid="home.availability.widget"
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="font-bold text-sm"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#FF4500" }}
              >
                Available This Week
              </h3>
              {/* Urgent badge */}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse"
                style={{
                  backgroundColor: "oklch(0.62 0.22 40 / 0.2)",
                  color: "#FF4500",
                }}
              >
                🟢 Room 1 free today!
              </span>
            </div>

            {/* Mini grid */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground font-normal py-1 pr-2 whitespace-nowrap w-24">
                      Room
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d}
                        className="text-center text-muted-foreground font-normal py-1 px-1"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROOMS.map((room) => (
                    <tr key={room}>
                      <td className="text-foreground/80 py-1.5 pr-2 whitespace-nowrap text-[11px]">
                        {room
                          .replace(" Rehearsal", "")
                          .replace(" Recording", "")}
                      </td>
                      {INITIAL_AVAILABILITY[room].map((slot, i) => (
                        <td key={DAYS[i]} className="text-center py-1.5 px-1">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: STATUS_COLORS[
                                slot.status
                              ] as string,
                              opacity: slot.status === "closed" ? 0.4 : 1,
                            }}
                            title={slot.note || slot.status}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                Partial
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: "#FF4500" }}
                />
                Booked
              </span>
            </div>

            <a
              href="https://old-chapel-leeds.jammed.app/bookings#/login"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="home.jammed.link"
              className="mt-3 flex items-center justify-center gap-1.5 w-full h-9 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: "#FF4500" }}
            >
              Book Now via Jammed →
            </a>
          </div>

          {/* Feed Header */}
          <div className="flex items-center justify-between mx-4 mt-4 mb-2">
            <h2
              className="font-bold text-base"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Community Feed
            </h2>
            <span className="text-xs text-muted-foreground">
              {posts.length} posts
            </span>
          </div>

          {/* Posts Feed */}
          <div className="flex flex-col gap-3 px-4">
            {sortedPosts.map((post, idx) => {
              const author = getUserById(post.authorId);
              const ocidIndex = idx + 1;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  data-ocid={`home.post.item.${ocidIndex}`}
                >
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: post.pinned
                        ? "oklch(0.62 0.22 40 / 0.4)"
                        : "oklch(0.28 0.015 45)",
                      boxShadow: post.pinned
                        ? "0 0 0 1px oklch(0.62 0.22 40 / 0.2)"
                        : "none",
                    }}
                  >
                    {/* Announcement banner */}
                    {post.isAnnouncement && (
                      <div
                        className="flex items-center gap-1.5 text-xs font-semibold mb-2 py-1 px-2 rounded-lg"
                        style={{
                          backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                          color: "#FF4500",
                        }}
                      >
                        📢 Announcement
                      </div>
                    )}

                    {/* Author row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{
                            backgroundColor: author?.avatarColor || "#FF4500",
                          }}
                        >
                          {author?.avatarInitials || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                              {author?.displayName || "Unknown"}
                            </span>
                            {author && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[author.role]}`}
                              >
                                {ROLE_LABELS[author.role]}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(post.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Pin indicator */}
                      {post.pinned && (
                        <Pin
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: "#FF4500" }}
                        />
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold text-sm mb-1 text-foreground"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {post.title}
                    </h3>

                    {/* Content */}
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {post.content}
                    </p>

                    {/* Hashtags */}
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {post.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                              color: "#FF4500",
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reactions + Comments */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <div className="flex gap-1">
                        {REACTIONS.map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => handleReact(post.id, emoji)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-accent transition-all"
                          >
                            <span>{emoji}</span>
                            {post.reactions[emoji] > 0 && (
                              <span className="text-muted-foreground">
                                {post.reactions[emoji]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post.commentCount > 0 && post.commentCount}
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom spacer */}
          <div className="h-6" />
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setShowCreatePost(true)}
        data-ocid="home.create_post.button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            key="create-post-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setShowCreatePost(false)
            }
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
                maxHeight: "85vh",
              }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  New Post
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3 overflow-y-auto">
                <Input
                  placeholder="Post title…"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost((p) => ({ ...p, title: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <Textarea
                  placeholder="What's on your mind?"
                  rows={4}
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost((p) => ({ ...p, content: e.target.value }))
                  }
                  className="rounded-xl text-sm resize-none"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Hashtags (e.g. GearUpdate, Room1)"
                    value={newPost.hashtags}
                    onChange={(e) =>
                      setNewPost((p) => ({ ...p, hashtags: e.target.value }))
                    }
                    className="h-11 rounded-xl pl-9 text-sm"
                    style={{
                      backgroundColor: "oklch(0.20 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  />
                </div>

                {(CURRENT_USER.role === "admin" ||
                  CURRENT_USER.role === "staff") && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="announcement"
                      checked={newPost.isAnnouncement}
                      onCheckedChange={(v) =>
                        setNewPost((p) => ({ ...p, isAnnouncement: v }))
                      }
                    />
                    <Label htmlFor="announcement" className="text-sm">
                      Mark as Announcement
                    </Label>
                  </div>
                )}

                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach file
                </button>
              </div>

              {/* Footer */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => setShowCreatePost(false)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPost.title.trim() || !newPost.content.trim()}
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  Post
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
