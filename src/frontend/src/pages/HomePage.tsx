import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENT_USER,
  type Post,
  ROLE_COLORS,
  ROLE_LABELS,
  formatRelativeTime,
  getUserById,
} from "@/data/mockData";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  Hash,
  MessageCircle,
  Paperclip,
  Pin,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { PostComment } from "../backend.d";

const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮"];

const ROOMS = ["Room 1", "Room 2", "Room 3"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SlotStatus = "available" | "partial" | "booked" | "closed";
type AvailabilityState = Record<string, SlotStatus[]>;

const STATUS_COLORS: Record<SlotStatus, string> = {
  available: "#22C55E",
  booked: "#FF4500",
  partial: "#FFA500",
  closed: "oklch(0.28 0.015 45)",
};

function getDefaultAvailability(): AvailabilityState {
  const state: AvailabilityState = {};
  for (const room of ROOMS) {
    state[room] = Array(7).fill("closed" as SlotStatus);
  }
  return state;
}

function slotToStatus(
  slot: { available: boolean; hourEnd: bigint } | undefined,
): SlotStatus {
  if (!slot) return "closed";
  if (!slot.available) return "booked";
  return slot.hourEnd <= 12n ? "partial" : "available";
}

export default function HomePage() {
  const { isAdmin } = useIsAdmin();
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText();

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    hashtags: "",
    isAnnouncement: false,
  });
  const [availability, setAvailability] = useState<AvailabilityState>(
    getDefaultAvailability(),
  );
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    displayName: string;
  } | null>(null);

  // postId -> [emoji, principalStrings[]]
  const [postReactions, setPostReactions] = useState<
    Record<string, Array<[string, string[]]>>
  >({});

  // comments
  const [postComments, setPostComments] = useState<
    Record<string, PostComment[]>
  >({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({});

  const loadReactionsForPosts = useCallback(
    async (postIds: string[]) => {
      if (!actor || postIds.length === 0) return;
      const results = await Promise.all(
        postIds.map(async (id) => {
          try {
            const raw = await actor.getPostReactions(BigInt(id));
            const mapped: Array<[string, string[]]> = raw.map(
              ([emoji, principals]) => [
                emoji,
                principals.map((p) => p.toString()),
              ],
            );
            return [id, mapped] as [string, Array<[string, string[]]>];
          } catch {
            return [id, []] as [string, Array<[string, string[]]>];
          }
        }),
      );
      setPostReactions((prev) => {
        const next = { ...prev };
        for (const [id, reactions] of results) next[id] = reactions;
        return next;
      });
    },
    [actor],
  );

  const loadPosts = useCallback(async () => {
    if (!actor) return;
    try {
      const backendPosts = await actor.getCommunityPosts();
      const mapped: Post[] = backendPosts.map((bp) => ({
        id: String(bp.id),
        authorId: bp.authorPrincipal.toString(),
        authorName: bp.authorName,
        title: bp.title,
        content: bp.content,
        hashtags: bp.hashtags,
        pinned: false,
        isAnnouncement: bp.isAnnouncement,
        timestamp: new Date(Number(bp.timestamp / 1_000_000n)).toISOString(),
        reactions: {},
        commentCount: 0,
      }));
      mapped.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setPosts(mapped);
      loadReactionsForPosts(mapped.map((p) => p.id));
    } catch (err) {
      console.error("Failed to load community posts:", err);
    }
  }, [actor, loadReactionsForPosts]);

  useEffect(() => {
    if (!actor) return;
    actor
      .getRoomAvailability()
      .then((raw) => {
        const state = getDefaultAvailability();
        for (const room of ROOMS) {
          for (let d = 0; d < 7; d++) {
            const slot = raw.find(
              (s) => s.room === room && Number(s.dayOfWeek) === d,
            );
            state[room][d] = slotToStatus(slot);
          }
        }
        setAvailability(state);
      })
      .catch(() => {});

    actor
      .getCallerUserProfile()
      .then((result) => {
        if (result) setCurrentUserProfile({ displayName: result.displayName });
      })
      .catch(() => {});

    setPostsLoading(true);
    loadPosts().finally(() => setPostsLoading(false));
  }, [actor, loadPosts]);

  const todayIdx = (new Date().getDay() + 6) % 7;
  const availableRoomToday = ROOMS.find(
    (room) => availability[room][todayIdx] === "available",
  );

  const getReactionCount = (postId: string, emoji: string): number => {
    const entry = (postReactions[postId] ?? []).find(([e]) => e === emoji);
    return entry ? entry[1].length : 0;
  };

  const hasReacted = (postId: string, emoji: string): boolean => {
    if (!currentPrincipal) return false;
    const entry = (postReactions[postId] ?? []).find(([e]) => e === emoji);
    return entry ? entry[1].includes(currentPrincipal) : false;
  };

  const handleReact = async (postId: string, emoji: string) => {
    if (!actor) return;
    try {
      await actor.addPostReaction(BigInt(postId), emoji);
      const raw = await actor.getPostReactions(BigInt(postId));
      const mapped: Array<[string, string[]]> = raw.map(([e, principals]) => [
        e,
        principals.map((p) => p.toString()),
      ]);
      setPostReactions((prev) => ({ ...prev, [postId]: mapped }));
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }));
    if (!isOpen && actor) {
      setCommentLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const comments = await actor.getPostComments(BigInt(postId));
        const sorted = [...comments].sort((a, b) =>
          Number(a.timestamp - b.timestamp),
        );
        setPostComments((prev) => ({ ...prev, [postId]: sorted }));
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setCommentLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const content = (commentInputs[postId] ?? "").trim();
    if (!content || !actor) return;
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      await actor.addPostComment(BigInt(postId), content);
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      const comments = await actor.getPostComments(BigInt(postId));
      const sorted = [...comments].sort((a, b) =>
        Number(a.timestamp - b.timestamp),
      );
      setPostComments((prev) => ({ ...prev, [postId]: sorted }));
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: bigint) => {
    if (!actor) return;
    try {
      await actor.deletePostComment(commentId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!actor) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return;
    }
    try {
      await actor.deleteCommunityPost(BigInt(postId));
      await loadPosts();
    } catch (err) {
      console.error("Failed to delete post:", err);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    const hashtagsArray = newPost.hashtags
      .split(/[,\s]+/)
      .map((h) => h.replace("#", "").trim())
      .filter(Boolean);
    const capturedTitle = newPost.title;
    const capturedContent = newPost.content;
    const capturedIsAnnouncement = newPost.isAnnouncement;
    setShowCreatePost(false);
    setNewPost({ title: "", content: "", hashtags: "", isAnnouncement: false });
    if (actor) {
      try {
        await actor.createCommunityPost(
          capturedTitle,
          capturedContent,
          hashtagsArray,
          capturedIsAnnouncement,
        );
        await loadPosts();
      } catch (err) {
        console.error("Failed to create post:", err);
        setPosts((prev) => [
          {
            id: `local-${Date.now()}`,
            authorId: CURRENT_USER.id,
            authorName: currentUserProfile?.displayName || "Unknown",
            title: capturedTitle,
            content: capturedContent,
            hashtags: hashtagsArray,
            pinned: false,
            isAnnouncement: capturedIsAnnouncement,
            timestamp: new Date().toISOString(),
            reactions: {},
            commentCount: 0,
          },
          ...prev,
        ]);
      }
    } else {
      setPosts((prev) => [
        {
          id: `local-${Date.now()}`,
          authorId: CURRENT_USER.id,
          authorName: currentUserProfile?.displayName || "Unknown",
          title: capturedTitle,
          content: capturedContent,
          hashtags: hashtagsArray,
          pinned: false,
          isAnnouncement: capturedIsAnnouncement,
          timestamp: new Date().toISOString(),
          reactions: {},
          commentCount: 0,
        },
        ...prev,
      ]);
    }
  };

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
              {availableRoomToday && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse"
                  style={{
                    backgroundColor: "oklch(0.62 0.22 40 / 0.2)",
                    color: "#FF4500",
                  }}
                >
                  🟢 {availableRoomToday} free today!
                </span>
              )}
            </div>
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
                        {room}
                      </td>
                      {availability[room].map((status, i) => (
                        <td key={DAYS[i]} className="text-center py-1.5 px-1">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: STATUS_COLORS[status] as string,
                              opacity: status === "closed" ? 0.4 : 1,
                            }}
                            title={status}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            {postsLoading ? (
              <div
                className="flex items-center justify-center py-12"
                data-ocid="home.posts.loading_state"
              >
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "#FF4500",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            ) : sortedPosts.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground text-sm"
                data-ocid="home.posts.empty_state"
              >
                No posts yet. Be the first to share something!
              </div>
            ) : (
              sortedPosts.map((post, idx) => {
                const author = getUserById(post.authorId);
                const displayName =
                  post.authorName || author?.displayName || "Unknown";
                const avatarInitials = post.authorName
                  ? post.authorName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : author?.avatarInitials || "?";
                const ocidIndex = idx + 1;
                const isCommentsOpen = openComments[post.id] ?? false;
                const comments = postComments[post.id] ?? [];
                const isLoadingComments = commentLoading[post.id] ?? false;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    data-ocid={`home.post.item.${ocidIndex}`}
                  >
                    <div
                      className="rounded-xl border p-4 relative"
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
                      {isAdmin && (
                        <button
                          type="button"
                          data-ocid={`home.post.delete_button.${ocidIndex}`}
                          onClick={() => handleDeletePost(post.id)}
                          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/20"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}

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

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{
                              backgroundColor: author?.avatarColor || "#FF4500",
                            }}
                          >
                            {avatarInitials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground">
                                {displayName}
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
                        {post.pinned && (
                          <Pin
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: "#FF4500" }}
                          />
                        )}
                      </div>

                      <h3
                        className="font-bold text-sm mb-1 text-foreground"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        {post.title}
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {post.content}
                      </p>

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

                      {/* Reactions + Reply bar */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                        <div className="flex gap-1 flex-wrap">
                          {REACTIONS.map((emoji) => {
                            const count = getReactionCount(post.id, emoji);
                            const reacted = hasReacted(post.id, emoji);
                            return (
                              <button
                                type="button"
                                key={emoji}
                                onClick={() => handleReact(post.id, emoji)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                                style={{
                                  backgroundColor: reacted
                                    ? "oklch(0.62 0.22 40 / 0.25)"
                                    : "transparent",
                                  border: reacted
                                    ? "1px solid oklch(0.62 0.22 40 / 0.6)"
                                    : "1px solid transparent",
                                }}
                              >
                                <span>{emoji}</span>
                                {count > 0 && (
                                  <span
                                    className={
                                      reacted
                                        ? "font-semibold"
                                        : "text-muted-foreground"
                                    }
                                    style={{
                                      color: reacted ? "#FF4500" : undefined,
                                    }}
                                  >
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          data-ocid={`home.post.toggle.${ocidIndex}`}
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1 text-xs transition-colors"
                          style={{
                            color: isCommentsOpen
                              ? "#FF4500"
                              : "var(--muted-foreground)",
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {isCommentsOpen && comments.length > 0 && (
                            <span>{comments.length}</span>
                          )}
                          <span>{isCommentsOpen ? "Hide" : "Reply"}</span>
                        </button>
                      </div>

                      {/* Comment Section */}
                      <AnimatePresence>
                        {isCommentsOpen && (
                          <motion.div
                            key={`comments-${post.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mt-3 pt-3 border-t"
                              style={{ borderColor: "oklch(0.28 0.015 45)" }}
                            >
                              {isLoadingComments ? (
                                <div className="flex items-center justify-center py-4">
                                  <div
                                    className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{
                                      borderColor: "#FF4500",
                                      borderTopColor: "transparent",
                                    }}
                                  />
                                </div>
                              ) : comments.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  No comments yet. Be the first!
                                </p>
                              ) : (
                                <div className="flex flex-col gap-2 mb-3">
                                  {comments.map((comment) => (
                                    <div
                                      key={String(comment.id)}
                                      className="flex gap-2 group"
                                    >
                                      <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: "#FF4500" }}
                                      >
                                        {comment.authorName
                                          .split(" ")
                                          .map((w) => w[0])
                                          .join("")
                                          .toUpperCase()
                                          .slice(0, 2)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-semibold text-foreground">
                                            {comment.authorName}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {formatRelativeTime(
                                              new Date(
                                                Number(
                                                  comment.timestamp /
                                                    1_000_000n,
                                                ),
                                              ).toISOString(),
                                            )}
                                          </span>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed break-words">
                                          {comment.content}
                                        </p>
                                      </div>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteComment(
                                              post.id,
                                              comment.id,
                                            )
                                          }
                                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 flex-shrink-0 mt-0.5"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Comment input */}
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Write a comment…"
                                  value={commentInputs[post.id] ?? ""}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSubmitComment(post.id);
                                    }
                                  }}
                                  className="flex-1 h-8 rounded-lg text-xs"
                                  style={{
                                    backgroundColor: "oklch(0.20 0.01 45)",
                                    borderColor: "oklch(0.28 0.015 45)",
                                  }}
                                  data-ocid={`home.post.comment.input.${ocidIndex}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSubmitComment(post.id)}
                                  disabled={
                                    !commentInputs[post.id]?.trim() ||
                                    (commentSubmitting[post.id] ?? false)
                                  }
                                  data-ocid={`home.post.comment.submit_button.${ocidIndex}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                                  style={{ backgroundColor: "#FF4500" }}
                                >
                                  {commentSubmitting[post.id] ? (
                                    <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5 text-white" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="h-6" />
        </div>
      </main>

      <button
        type="button"
        onClick={() => setShowCreatePost(true)}
        data-ocid="home.create_post.button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

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
