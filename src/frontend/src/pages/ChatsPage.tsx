import type { AppUserRole, UserProfile } from "@/backend";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type ChatGroup, INITIAL_CHAT_GROUPS } from "@/data/mockData";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import type { Principal } from "@icp-sdk/core/principal";
import { ArrowLeft, Lock, Plus, Send, Trash2, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BackendMessage {
  id: bigint;
  channelId: string;
  authorPrincipal: { toText: () => string };
  authorName: string;
  content: string;
  timestamp: bigint;
}

type ReactionMap = Map<
  string,
  Array<[string, Array<{ toText: () => string }>]>
>;

const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function roleLabel(role: AppUserRole | string): string {
  const map: Record<string, string> = {
    admin: "Admin",
    staff: "Staff",
    musician: "Musician",
    client: "Client",
  };
  return map[role as string] ?? String(role);
}

function formatJoinedAt(ns: bigint): string {
  const ms = Number(ns) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ChatsPageProps {
  onChatOpenChange?: (open: boolean) => void;
}

export default function ChatsPage({ onChatOpenChange }: ChatsPageProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const [groups] = useState<ChatGroup[]>(
    INITIAL_CHAT_GROUPS.map((g) => ({
      ...g,
      messages: [],
      lastMessage: "No messages yet",
      lastTimestamp: "",
      unreadCount: 0,
    })),
  );
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [backendMessages, setBackendMessages] = useState<BackendMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [extraGroups, setExtraGroups] = useState<ChatGroup[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reactions state
  const [reactions, setReactions] = useState<ReactionMap>(new Map());
  // Which message's emoji picker is open (by id string)
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  // User profile sheet
  const [profileSheet, setProfileSheet] = useState<{
    principal: { toText: () => string };
    name: string;
  } | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const allGroups = [...groups, ...extraGroups];
  const myPrincipal = identity?.getPrincipal().toText() ?? "";
  const ADMIN_PRINCIPAL =
    "ulyt5-slv4a-xrfbx-seije-74i6r-4nkkh-ydqng-hgdb2-r3tlc-tkvp4-hae";
  const isAdmin = myPrincipal === ADMIN_PRINCIPAL;
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (channelId: string) => {
      if (!actor) return;
      setLoadingMessages(true);
      try {
        const msgs = await actor.getMessages(channelId);
        const reversed = [...(msgs as BackendMessage[])].reverse();
        setBackendMessages(reversed);
        // Load reactions for all messages in parallel
        if (reversed.length > 0) {
          const entries = await Promise.all(
            reversed.map(async (m) => {
              try {
                const r = await actor.getReactions(m.id);
                return [m.id.toString(), r] as [string, typeof r];
              } catch {
                return [m.id.toString(), []] as [string, never[]];
              }
            }),
          );
          setReactions(
            new Map(
              entries as [
                string,
                Array<[string, Array<{ toText: () => string }>]>,
              ][],
            ),
          );
        }
      } catch {
        setBackendMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [actor],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll after messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [backendMessages]);

  // Close picker when clicking outside
  useEffect(() => {
    if (!openPickerFor) return;
    const handler = () => setOpenPickerFor(null);
    window.addEventListener("click", handler, { capture: true });
    return () =>
      window.removeEventListener("click", handler, { capture: true });
  }, [openPickerFor]);

  const openGroup = async (group: ChatGroup) => {
    setActiveGroup(group);
    setBackendMessages([]);
    setReactions(new Map());
    onChatOpenChange?.(true);
    await loadMessages(group.id);
  };

  const closeGroup = () => {
    setActiveGroup(null);
    setBackendMessages([]);
    setReactions(new Map());
    onChatOpenChange?.(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeGroup || !actor || sending) return;
    const content = messageInput.trim();
    setMessageInput("");
    setSending(true);
    try {
      await actor.postMessage(activeGroup.id, content);
      await loadMessages(activeGroup.id);
    } catch {
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleAdminDelete = async (msgId: bigint) => {
    if (!actor || !isAdmin) return;
    const idStr = msgId.toString();
    setDeletingMsgId(idStr);
    try {
      await actor.adminDeleteMessage(msgId);
      setBackendMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to delete message:", msg);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleReact = async (msgId: bigint, emoji: string) => {
    if (!actor) return;
    setOpenPickerFor(null);
    try {
      await actor.addReaction(msgId, emoji);
      const updated = await actor.getReactions(msgId);
      setReactions((prev) => {
        const next = new Map(prev);
        next.set(
          msgId.toString(),
          updated as Array<[string, Array<{ toText: () => string }>]>,
        );
        return next;
      });
    } catch {
      // silently ignore
    }
  };

  const openProfile = async (
    principal: { toText: () => string },
    name: string,
  ) => {
    setProfileSheet({ principal, name });
    setProfileData(null);
    setProfileLoading(true);
    try {
      const p = await actor?.getUserProfile(principal as unknown as Principal);
      setProfileData((p as UserProfile | null) ?? null);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ChatGroup = {
      id: `chat-custom-${Date.now()}`,
      name: newGroupName,
      description: "Group chat",
      emoji: "💬",
      isLocked: false,
      lastMessage: "Group created",
      lastTimestamp: "Just now",
      unreadCount: 0,
      messages: [],
    };
    setExtraGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setShowNewGroup(false);
  };

  const formatTime = (ts: bigint) => {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // === Chat Thread View ===
  if (activeGroup) {
    return (
      <div className="flex flex-col h-screen">
        {/* Chat Header */}
        <header
          className="flex items-center gap-3 h-14 px-4 flex-shrink-0 sticky top-0 z-40"
          style={{
            backgroundColor: "oklch(0.10 0.008 40 / 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid oklch(0.28 0.015 45)",
          }}
        >
          <button
            type="button"
            onClick={closeGroup}
            data-ocid="chats.back.button"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
          >
            {activeGroup.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-sm truncate"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {activeGroup.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeGroup.isLocked
                ? "🔒 Staff only"
                : `${backendMessages.length} messages`}
            </p>
          </div>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ paddingBottom: "80px" }}
        >
          {loadingMessages && (
            <div
              data-ocid="chats.messages.loading_state"
              className="flex flex-col gap-3 py-4"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                >
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <Skeleton
                    className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-40" : "w-56"}`}
                  />
                </div>
              ))}
            </div>
          )}

          {!loadingMessages && backendMessages.length === 0 && (
            <div
              data-ocid="chats.messages.empty_state"
              className="text-center text-muted-foreground text-sm py-8"
            >
              No messages yet. Start the conversation!
            </div>
          )}

          <div className="flex flex-col gap-1">
            {backendMessages.map((msg) => {
              const isOwn = msg.authorPrincipal.toText() === myPrincipal;
              const initials = msg.authorName
                ? msg.authorName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "?";
              const msgIdStr = msg.id.toString();
              const msgReactions = reactions.get(msgIdStr) ?? [];
              const isPickerOpen = openPickerFor === msgIdStr;

              return (
                <div
                  key={msgIdStr}
                  className={`flex items-end gap-2 mb-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar - clickable for other users */}
                  {!isOwn && (
                    <button
                      type="button"
                      onClick={() =>
                        openProfile(msg.authorPrincipal, msg.authorName)
                      }
                      data-ocid="chats.user.open_modal_button"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-1 hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ backgroundColor: "#FF4500" }}
                      title={`View ${msg.authorName}'s profile`}
                    >
                      {initials}
                    </button>
                  )}

                  <div
                    className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                  >
                    {/* Author name - clickable */}
                    {!isOwn && (
                      <button
                        type="button"
                        onClick={() =>
                          openProfile(msg.authorPrincipal, msg.authorName)
                        }
                        data-ocid="chats.user.open_modal_button"
                        className="text-xs text-muted-foreground pl-1 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {msg.authorName}
                      </button>
                    )}

                    {/* Bubble + emoji trigger wrapper */}
                    <div className="relative group">
                      <div
                        className={`px-3 py-2 text-sm leading-relaxed rounded-2xl ${
                          isOwn ? "text-white rounded-br-sm" : "rounded-bl-sm"
                        }`}
                        style={{
                          backgroundColor: isOwn
                            ? "#FF4500"
                            : "oklch(0.22 0.01 45)",
                        }}
                      >
                        {msg.content}
                      </div>

                      {/* Admin delete button — shown for ALL messages (including own) when isAdmin */}
                      {isAdmin && (
                        <button
                          type="button"
                          data-ocid="chats.message.delete_button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminDelete(msg.id);
                          }}
                          disabled={deletingMsgId === msgIdStr}
                          aria-label="Delete message"
                          className={`absolute -top-2 ${isOwn ? "-left-6" : "-right-6"} w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm bg-red-600/80 border border-red-500/50 hover:bg-red-600 disabled:opacity-40 opacity-0 group-hover:opacity-100 focus:opacity-100`}
                        >
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                      <button
                        type="button"
                        data-ocid="chats.message.toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPickerFor(isPickerOpen ? null : msgIdStr);
                        }}
                        className={`absolute -bottom-2 ${
                          isOwn ? "-left-6" : "-right-6"
                        } w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-opacity bg-muted border border-border shadow-sm
                          opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
                        style={{ opacity: undefined }} // allow className to control
                        aria-label="Add reaction"
                      >
                        😊
                      </button>

                      {/* Emoji picker popover */}
                      <AnimatePresence>
                        {isPickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 4 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            data-ocid="chats.reaction.popover"
                            className={`absolute z-50 bottom-full mb-2 flex gap-1 p-1.5 rounded-2xl shadow-xl ${
                              isOwn ? "right-0" : "left-0"
                            }`}
                            style={{
                              backgroundColor: "oklch(0.18 0.012 45)",
                              border: "1px solid oklch(0.30 0.015 45)",
                            }}
                          >
                            {EMOJI_QUICK.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReact(msg.id, emoji)}
                                className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-accent transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reaction pills */}
                    {msgReactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {msgReactions.map(([emoji, principals]) => {
                          const hasReacted = principals.some(
                            (p) => p.toText() === myPrincipal,
                          );
                          return (
                            <button
                              key={emoji}
                              type="button"
                              data-ocid="chats.reaction.toggle"
                              onClick={() => handleReact(msg.id, emoji)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all hover:brightness-110"
                              style={{
                                backgroundColor: hasReacted
                                  ? "oklch(0.62 0.22 40 / 0.25)"
                                  : "oklch(0.22 0.01 45)",
                                border: hasReacted
                                  ? "1px solid oklch(0.62 0.22 40 / 0.5)"
                                  : "1px solid oklch(0.30 0.015 45)",
                                color: hasReacted ? "#FF4500" : "inherit",
                              }}
                            >
                              <span>{emoji}</span>
                              <span>{principals.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <span className="text-[10px] text-muted-foreground px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 z-40"
          style={{
            backgroundColor: "oklch(0.10 0.008 40)",
            borderTop: "1px solid oklch(0.28 0.015 45)",
            maxWidth: "672px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <Input
            placeholder="Message…"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendMessage()
            }
            className="flex-1 h-11 rounded-xl text-sm"
            style={{
              backgroundColor: "oklch(0.20 0.01 45)",
              borderColor: "oklch(0.28 0.015 45)",
            }}
            data-ocid="chats.message.input"
            disabled={sending}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
            data-ocid="chats.message.send.button"
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
            style={{ backgroundColor: "#FF4500" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* User Profile Sheet */}
        <AnimatePresence>
          {profileSheet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
              onClick={(e) =>
                e.target === e.currentTarget && setProfileSheet(null)
              }
              data-ocid="chats.profile.modal"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-4"
                style={{
                  backgroundColor: "oklch(0.15 0.01 45)",
                  border: "1px solid oklch(0.28 0.015 45)",
                }}
              >
                {/* Handle + close */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-12 h-1 rounded-full mx-auto"
                    style={{ backgroundColor: "oklch(0.35 0.01 45)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setProfileSheet(null)}
                    data-ocid="chats.profile.close_button"
                    className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {profileLoading ? (
                  <div
                    data-ocid="chats.profile.loading_state"
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <Skeleton className="w-20 h-20 rounded-full" />
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-2">
                    {/* Avatar */}
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: "#FF4500" }}
                    >
                      {profileSheet.name
                        ? profileSheet.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "?"}
                    </div>

                    {/* Name */}
                    <h2
                      className="text-xl font-bold"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {profileData?.displayName ?? profileSheet.name}
                    </h2>

                    {/* Role badge */}
                    {profileData?.role && (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "oklch(0.62 0.22 40 / 0.18)",
                          color: "#FF4500",
                          border: "1px solid oklch(0.62 0.22 40 / 0.35)",
                        }}
                      >
                        {roleLabel(profileData.role)}
                      </span>
                    )}

                    {/* Member since */}
                    {profileData?.joinedAt && (
                      <p className="text-sm text-muted-foreground">
                        Member since {formatJoinedAt(profileData.joinedAt)}
                      </p>
                    )}

                    {!profileData && !profileLoading && (
                      <p className="text-sm text-muted-foreground">
                        Profile unavailable
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => setProfileSheet(null)}
                  data-ocid="chats.profile.close_button"
                  className="w-full h-11 rounded-xl"
                  variant="outline"
                >
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // === Group List View ===
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Chats" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between px-4 pt-4 mb-3">
            <h2
              className="font-bold text-base"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Group Channels
            </h2>
            <button
              type="button"
              onClick={() => setShowNewGroup(true)}
              data-ocid="chats.new_group.button"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:brightness-110"
              style={{
                backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                color: "#FF4500",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Group
            </button>
          </div>

          <p className="text-xs text-muted-foreground px-4 mb-3">
            All channels are visible to every member.
          </p>

          <div className="flex flex-col gap-1 px-4">
            {allGroups.map((group, idx) => (
              <motion.button
                key={group.id}
                onClick={() => openGroup(group)}
                data-ocid={`chats.group.item.${idx + 1}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all text-left"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  border: "1px solid oklch(0.28 0.015 45)",
                  marginBottom: "2px",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: "oklch(0.25 0.015 45)" }}
                >
                  {group.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {group.name}
                    </p>
                    {group.isLocked && (
                      <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {group.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setShowNewGroup(false)
            }
            data-ocid="chats.new_group.modal"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  New Group
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(false)}
                  data-ocid="chats.new_group.close_button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Input
                placeholder="Group name…"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                data-ocid="chats.new_group.name.input"
                className="h-11 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(0.20 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowNewGroup(false)}
                  data-ocid="chats.new_group.cancel_button"
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  data-ocid="chats.new_group.submit_button"
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  Create
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
