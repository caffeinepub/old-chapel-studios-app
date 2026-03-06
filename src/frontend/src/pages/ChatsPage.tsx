import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CURRENT_USER,
  type ChatGroup,
  type ChatMessage,
  INITIAL_CHAT_GROUPS,
  getUserById,
} from "@/data/mockData";
import {
  ArrowLeft,
  Lock,
  Paperclip,
  Pin,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const REACTIONS = ["👍", "❤️", "😂", "🔥", "🎵"];

export default function ChatsPage() {
  const [groups, setGroups] = useState<ChatGroup[]>(INITIAL_CHAT_GROUPS);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdminOrStaff =
    CURRENT_USER.role === "admin" || CURRENT_USER.role === "staff";

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on group change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeGroup]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeGroup) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      authorId: CURRENT_USER.id,
      content: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      reactions: {},
    };

    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeGroup.id
          ? {
              ...g,
              messages: [...g.messages, newMsg],
              lastMessage: `You: ${newMsg.content}`,
              lastTimestamp: "Just now",
              unreadCount: 0,
            }
          : g,
      ),
    );

    setActiveGroup((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, newMsg],
            unreadCount: 0,
          }
        : null,
    );

    setMessageInput("");
  };

  const handleReactToMessage = (
    groupId: string,
    msgId: string,
    emoji: string,
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              messages: g.messages.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      reactions: {
                        ...m.reactions,
                        [emoji]: (m.reactions[emoji] || 0) + 1,
                      },
                    }
                  : m,
              ),
            }
          : g,
      ),
    );
    if (activeGroup?.id === groupId) {
      setActiveGroup((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      reactions: {
                        ...m.reactions,
                        [emoji]: (m.reactions[emoji] || 0) + 1,
                      },
                    }
                  : m,
              ),
            }
          : null,
      );
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ChatGroup = {
      id: `chat-${Date.now()}`,
      name: newGroupName,
      description: "New group chat",
      emoji: "💬",
      isLocked: false,
      lastMessage: "Group created",
      lastTimestamp: "Just now",
      unreadCount: 0,
      messages: [],
    };
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setShowNewGroup(false);
  };

  const openGroup = (group: ChatGroup) => {
    // Mark as read
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, unreadCount: 0 } : g)),
    );
    setActiveGroup({ ...group, unreadCount: 0 });
  };

  // === Chat Thread View ===
  if (activeGroup) {
    const pinnedMsg = activeGroup.messages.find((m) => m.isPinned);

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
            onClick={() => setActiveGroup(null)}
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
                : `${activeGroup.messages.length} messages`}
            </p>
          </div>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        {/* Pinned Message */}
        {pinnedMsg && (
          <div
            className="flex items-center gap-2 px-4 py-2 text-xs border-b"
            style={{
              backgroundColor: "oklch(0.62 0.22 40 / 0.08)",
              borderColor: "oklch(0.62 0.22 40 / 0.2)",
            }}
          >
            <Pin
              className="w-3 h-3 flex-shrink-0"
              style={{ color: "#FF4500" }}
            />
            <span className="text-muted-foreground truncate">
              <strong className="text-foreground">Pinned:</strong>{" "}
              {pinnedMsg.content}
            </span>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          style={{ paddingBottom: "80px" }}
        >
          {activeGroup.messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Start the conversation!
            </div>
          )}

          {activeGroup.messages.map((msg) => {
            const isOwn = msg.authorId === CURRENT_USER.id;
            const author = getUserById(msg.authorId);
            const hasReactions = Object.keys(msg.reactions).length > 0;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isOwn && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-1"
                    style={{ backgroundColor: author?.avatarColor || "#666" }}
                  >
                    {author?.avatarInitials || "?"}
                  </div>
                )}

                <div
                  className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                >
                  {!isOwn && (
                    <span className="text-xs text-muted-foreground pl-1">
                      {author?.displayName}
                    </span>
                  )}

                  <div className="group relative">
                    <div
                      className={`px-3 py-2 text-sm leading-relaxed ${isOwn ? "msg-own" : "msg-other"}`}
                    >
                      {msg.content}
                    </div>

                    {/* Reaction button (shows on hover) */}
                    <div
                      className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10 ${
                        isOwn ? "right-full mr-1" : "left-full ml-1"
                      }`}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() =>
                            handleReactToMessage(activeGroup.id, msg.id, emoji)
                          }
                          className="text-sm w-7 h-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reactions */}
                  {hasReactions && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {Object.entries(msg.reactions)
                        .filter(([, count]) => count > 0)
                        .map(([emoji, count]) => (
                          <button
                            type="button"
                            key={emoji}
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full hover:brightness-110 transition-all"
                            style={{
                              backgroundColor: "oklch(0.25 0.01 45)",
                              border: "1px solid oklch(0.30 0.015 45)",
                            }}
                          >
                            {emoji}
                            <span className="text-muted-foreground">
                              {count}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 pb-safe z-40"
          style={{
            backgroundColor: "oklch(0.10 0.008 40)",
            borderTop: "1px solid oklch(0.28 0.015 45)",
          }}
        >
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent text-muted-foreground"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
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
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            data-ocid="chats.message.send.button"
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-all disabled:opacity-40"
            style={{ backgroundColor: "#FF4500" }}
          >
            <Send className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // === Group List View ===
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Chats" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 pt-4 mb-3">
            <h2
              className="font-bold text-base"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Group Channels
            </h2>
            {isAdminOrStaff && (
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
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground px-4 mb-3">
            All channels are visible to every member. No private DMs.
          </p>

          {/* Group list */}
          <div className="flex flex-col gap-1 px-4">
            {groups.map((group, idx) => (
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
                {/* Emoji/icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: "oklch(0.25 0.015 45)" }}
                >
                  {group.emoji}
                </div>

                {/* Text */}
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
                    {group.lastMessage}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {group.lastTimestamp}
                  </span>
                  {group.unreadCount > 0 && (
                    <span
                      className="min-w-[20px] h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1.5"
                      style={{ backgroundColor: "#FF4500" }}
                    >
                      {group.unreadCount}
                    </span>
                  )}
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
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
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
