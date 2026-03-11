import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type Poll, type PollOption, getUserById } from "@/data/mockData";
import { BarChart3, Check, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingVotes, setPendingVotes] = useState<Record<string, number[]>>(
    {},
  );
  const [newPoll, setNewPoll] = useState({
    title: "",
    options: ["", ""],
    multiSelect: false,
    anonymous: false,
  });

  const handleVote = (
    pollId: string,
    optionId: number,
    multiSelect: boolean,
  ) => {
    setPendingVotes((prev) => {
      const current = prev[pollId] || [];
      if (multiSelect) {
        return {
          ...prev,
          [pollId]: current.includes(optionId)
            ? current.filter((v) => v !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [pollId]: [optionId] };
    });
  };

  const handleConfirmVote = (pollId: string) => {
    const votes = pendingVotes[pollId] || [];
    if (votes.length === 0) return;

    setPolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              userVote: votes,
              options: p.options.map((opt) =>
                votes.includes(opt.id) ? { ...opt, votes: opt.votes + 1 } : opt,
              ),
            }
          : p,
      ),
    );

    setPendingVotes((prev) => {
      const next = { ...prev };
      delete next[pollId];
      return next;
    });
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll((p) => ({ ...p, options: [...p.options, ""] }));
    }
  };

  const removeOption = (idx: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll((p) => ({
        ...p,
        options: p.options.filter((_, i) => i !== idx),
      }));
    }
  };

  const handleCreatePoll = () => {
    const validOptions = newPoll.options.filter((o) => o.trim());
    if (!newPoll.title.trim() || validOptions.length < 2) return;

    const poll: Poll = {
      id: `poll-${Date.now()}`,
      title: newPoll.title,
      creatorId: "user-1",
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: "active",
      multiSelect: newPoll.multiSelect,
      anonymous: newPoll.anonymous,
      options: validOptions.map((text, i) => ({
        id: i + 1,
        text,
        votes: 0,
      })),
    };

    setPolls((prev) => [poll, ...prev]);
    setNewPoll({
      title: "",
      options: ["", ""],
      multiSelect: false,
      anonymous: false,
    });
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Polls" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-bold text-base"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Community Polls
            </h2>
            <span className="text-xs text-muted-foreground">
              {polls.filter((p) => p.status === "active").length} active
            </span>
          </div>

          {polls.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="polls.empty_state"
            >
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No polls yet</p>
              <p className="text-xs mt-1">Create the first poll!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {polls.map((poll, idx) => {
                const creator = getUserById(poll.creatorId);
                const totalVotes = poll.options.reduce(
                  (sum, o) => sum + o.votes,
                  0,
                );
                const pending = pendingVotes[poll.id] || [];
                const hasVoted = !!poll.userVote;
                const showResults = hasVoted || poll.status === "closed";
                const maxVotes = Math.max(
                  ...poll.options.map((o) => o.votes),
                  1,
                );

                return (
                  <motion.div
                    key={poll.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    data-ocid={`polls.poll.item.${idx + 1}`}
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    {/* Poll header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h3
                          className="font-bold text-sm leading-tight"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          {poll.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {creator?.displayName} · {poll.createdAt} ·{" "}
                          {totalVotes} votes
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor:
                              poll.status === "active"
                                ? "oklch(0.55 0.17 142 / 0.2)"
                                : "oklch(0.28 0.015 45)",
                            color:
                              poll.status === "active"
                                ? "#22C55E"
                                : "oklch(0.55 0.015 55)",
                          }}
                        >
                          {poll.status === "active" ? "Active" : "Closed"}
                        </span>
                        {poll.multiSelect && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                              color: "#FF4500",
                            }}
                          >
                            Multi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const pct =
                          totalVotes > 0
                            ? Math.round((option.votes / totalVotes) * 100)
                            : 0;
                        const isSelected = pending.includes(option.id);
                        const isVoted = poll.userVote?.includes(option.id);
                        const isWinner =
                          poll.status === "closed" &&
                          option.votes === maxVotes &&
                          maxVotes > 0;

                        return (
                          <div key={option.id}>
                            {showResults ? (
                              /* Results bar */
                              <div className="relative">
                                <div
                                  className="w-full h-10 rounded-xl overflow-hidden relative flex items-center px-3"
                                  style={{
                                    backgroundColor: "oklch(0.22 0.01 45)",
                                    border: isVoted
                                      ? "1px solid oklch(0.62 0.22 40 / 0.5)"
                                      : "1px solid transparent",
                                  }}
                                >
                                  {/* Progress fill */}
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-xl transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: isVoted
                                        ? "oklch(0.62 0.22 40 / 0.3)"
                                        : "oklch(0.62 0.22 40 / 0.12)",
                                    }}
                                  />
                                  <div className="relative flex items-center justify-between w-full">
                                    <span
                                      className="text-sm font-medium truncate"
                                      style={{
                                        color: isWinner
                                          ? "#FF4500"
                                          : "oklch(0.85 0.01 50)",
                                      }}
                                    >
                                      {isWinner ? "🏆 " : ""}
                                      {option.text}
                                    </span>
                                    <span
                                      className="text-xs font-bold ml-2 flex-shrink-0"
                                      style={{ color: "#FF4500" }}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Voting button */
                              <button
                                type="button"
                                onClick={() =>
                                  poll.status === "active" &&
                                  handleVote(
                                    poll.id,
                                    option.id,
                                    poll.multiSelect,
                                  )
                                }
                                disabled={poll.status === "closed"}
                                className="w-full h-10 flex items-center gap-2 rounded-xl border px-3 transition-all text-sm text-left"
                                style={{
                                  backgroundColor: isSelected
                                    ? "oklch(0.62 0.22 40 / 0.15)"
                                    : "oklch(0.22 0.01 45)",
                                  borderColor: isSelected
                                    ? "oklch(0.62 0.22 40 / 0.5)"
                                    : "oklch(0.28 0.015 45)",
                                  color: isSelected
                                    ? "#FF4500"
                                    : "oklch(0.85 0.01 50)",
                                }}
                              >
                                <div
                                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                  style={{
                                    borderColor: isSelected
                                      ? "#FF4500"
                                      : "oklch(0.35 0.015 45)",
                                    backgroundColor: isSelected
                                      ? "#FF4500"
                                      : "transparent",
                                  }}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="flex-1 truncate">
                                  {option.text}
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Vote button */}
                    {!showResults && poll.status === "active" && (
                      <Button
                        onClick={() => handleConfirmVote(poll.id)}
                        disabled={pending.length === 0}
                        className="w-full mt-3 h-10 rounded-xl font-semibold text-white text-sm"
                        style={{ backgroundColor: "#FF4500" }}
                      >
                        Submit Vote{" "}
                        {pending.length > 0 ? `(${pending.length})` : ""}
                      </Button>
                    )}

                    {hasVoted && poll.status === "active" && (
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        ✓ You voted
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Poll FAB */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        data-ocid="polls.create.button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Create Poll Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setShowCreate(false)
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
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Create Poll
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Poll question…"
                  value={newPoll.title}
                  onChange={(e) =>
                    setNewPoll((p) => ({ ...p, title: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Options (min 2, max 6)
                  </Label>
                  {newPoll.options.map((opt, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: poll options are order-dependent
                    <div key={`option-${i}`} className="flex gap-2">
                      <Input
                        placeholder={`Option ${i + 1}…`}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...newPoll.options];
                          opts[i] = e.target.value;
                          setNewPoll((p) => ({ ...p, options: opts }));
                        }}
                        className="h-10 rounded-xl text-sm flex-1"
                        style={{
                          backgroundColor: "oklch(0.20 0.01 45)",
                          borderColor: "oklch(0.28 0.015 45)",
                        }}
                      />
                      {newPoll.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-accent flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  ))}

                  {newPoll.options.length < 6 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="h-9 text-xs font-medium rounded-xl border border-dashed transition-colors hover:border-primary"
                      style={{
                        borderColor: "oklch(0.35 0.02 45)",
                        color: "oklch(0.65 0.015 55)",
                      }}
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="multiselect"
                    checked={newPoll.multiSelect}
                    onCheckedChange={(v) =>
                      setNewPoll((p) => ({ ...p, multiSelect: v }))
                    }
                  />
                  <Label htmlFor="multiselect" className="text-sm">
                    Allow multiple selections
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="anon"
                    checked={newPoll.anonymous}
                    onCheckedChange={(v) =>
                      setNewPoll((p) => ({ ...p, anonymous: v }))
                    }
                  />
                  <Label htmlFor="anon" className="text-sm">
                    Anonymous voting
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePoll}
                  disabled={
                    !newPoll.title.trim() ||
                    newPoll.options.filter((o) => o.trim()).length < 2
                  }
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  Create Poll
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
