import type { Poll } from "@/backend";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActor } from "@/hooks/useActor";
import { BarChart3, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PollWithVotes extends Poll {
  userVotes: number[];
  hasVoted: boolean;
}

export default function PollsPage() {
  const { actor } = useActor();

  const [polls, setPolls] = useState<PollWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingVotes, setPendingVotes] = useState<Record<string, number[]>>(
    {},
  );
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const [deletingPoll, setDeletingPoll] = useState<string | null>(null);
  const [newPoll, setNewPoll] = useState({
    title: "",
    options: ["", ""],
    multiSelect: false,
    anonymous: false,
  });

  const loadPolls = useCallback(async () => {
    if (!actor) return;
    try {
      const allPolls = await actor.getAllPolls();
      // Fetch user votes for all polls in parallel
      const pollsWithVotes = await Promise.all(
        allPolls.map(async (poll) => {
          try {
            const userVotesBigInt = await actor.getUserVotes(poll.id);
            const userVotes = userVotesBigInt.map(Number);
            return {
              ...poll,
              userVotes,
              hasVoted: userVotes.length > 0,
            } as PollWithVotes;
          } catch {
            return { ...poll, userVotes: [], hasVoted: false } as PollWithVotes;
          }
        }),
      );
      // Sort newest first
      pollsWithVotes.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setPolls(pollsWithVotes);
    } catch {
      toast.error("Failed to load polls");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    const init = async () => {
      const [, adminResult] = await Promise.allSettled([
        loadPolls(),
        actor.checkIfCallerIsAdmin(),
      ]);
      if (adminResult.status === "fulfilled") {
        setIsAdmin(adminResult.value);
      }
    };
    init();
  }, [actor, loadPolls]);

  const handleVoteToggle = (
    pollId: string,
    optionIndex: number,
    multiSelect: boolean,
  ) => {
    setPendingVotes((prev) => {
      const current = prev[pollId] || [];
      if (multiSelect) {
        return {
          ...prev,
          [pollId]: current.includes(optionIndex)
            ? current.filter((v) => v !== optionIndex)
            : [...current, optionIndex],
        };
      }
      return { ...prev, [pollId]: [optionIndex] };
    });
  };

  const handleSubmitVote = async (pollId: bigint) => {
    const pollIdStr = String(pollId);
    const selected = pendingVotes[pollIdStr] || [];
    if (selected.length === 0 || !actor) return;

    setSubmittingVote(pollIdStr);
    try {
      await actor.vote(pollId, selected.map(BigInt));
      setPendingVotes((prev) => {
        const next = { ...prev };
        delete next[pollIdStr];
        return next;
      });
      toast.success("Vote submitted!");
      await loadPolls();
    } catch (err: any) {
      const msg = String(err);
      if (msg.toLowerCase().includes("already")) {
        toast.error("You have already voted in this poll");
      } else {
        toast.error("Failed to submit vote. Please try again.");
      }
    } finally {
      setSubmittingVote(null);
    }
  };

  const handleDeletePoll = async (pollId: bigint) => {
    if (!actor) return;
    const pollIdStr = String(pollId);
    setDeletingPoll(pollIdStr);
    try {
      await actor.deletePoll(pollId);
      setPolls((prev) => prev.filter((p) => String(p.id) !== pollIdStr));
      toast.success("Poll deleted");
    } catch {
      toast.error("Failed to delete poll");
    } finally {
      setDeletingPoll(null);
    }
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

  const handleCreatePoll = async () => {
    if (!actor) return;
    const validOptions = newPoll.options.filter((o) => o.trim());
    if (!newPoll.title.trim() || validOptions.length < 2) return;

    setCreating(true);
    try {
      await actor.createPoll(
        newPoll.title.trim(),
        validOptions,
        newPoll.multiSelect,
        newPoll.anonymous,
      );
      toast.success("Poll created!");
      setNewPoll({
        title: "",
        options: ["", ""],
        multiSelect: false,
        anonymous: false,
      });
      setShowCreate(false);
      await loadPolls();
    } catch {
      toast.error("Failed to create poll. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const activeCount = polls.filter((p) => p.isActive).length;

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
              {activeCount} active
            </span>
          </div>

          {loading ? (
            <div
              className="flex items-center justify-center py-16"
              data-ocid="polls.loading_state"
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#FF4500" }}
              />
            </div>
          ) : polls.length === 0 ? (
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
                const pollIdStr = String(poll.id);
                const totalVotes = poll.options.reduce(
                  (sum, o) => sum + Number(o.voteCount),
                  0,
                );
                const pending = pendingVotes[pollIdStr] || [];
                const showResults = poll.hasVoted || !poll.isActive;
                const maxVotes = Math.max(
                  ...poll.options.map((o) => Number(o.voteCount)),
                  1,
                );
                const isSubmitting = submittingVote === pollIdStr;
                const isDeleting = deletingPoll === pollIdStr;

                return (
                  <motion.div
                    key={pollIdStr}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    data-ocid={`polls.item.${idx + 1}`}
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
                          Member · {totalVotes} vote
                          {totalVotes !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: poll.isActive
                              ? "oklch(0.55 0.17 142 / 0.2)"
                              : "oklch(0.28 0.015 45)",
                            color: poll.isActive
                              ? "#22C55E"
                              : "oklch(0.55 0.015 55)",
                          }}
                        >
                          {poll.isActive ? "Active" : "Closed"}
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
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePoll(poll.id)}
                            disabled={isDeleting}
                            data-ocid={`polls.delete_button.${idx + 1}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/20"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {poll.options.map((option, optIdx) => {
                        const voteCount = Number(option.voteCount);
                        const pct =
                          totalVotes > 0
                            ? Math.round((voteCount / totalVotes) * 100)
                            : 0;
                        const isSelected = pending.includes(optIdx);
                        const isVoted = poll.userVotes.includes(optIdx);
                        const isWinner =
                          !poll.isActive &&
                          voteCount === maxVotes &&
                          maxVotes > 0;

                        return (
                          // biome-ignore lint/suspicious/noArrayIndexKey: option index is positional
                          <div key={optIdx}>
                            {showResults ? (
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
                              <button
                                type="button"
                                onClick={() =>
                                  poll.isActive &&
                                  handleVoteToggle(
                                    pollIdStr,
                                    optIdx,
                                    poll.multiSelect,
                                  )
                                }
                                disabled={!poll.isActive}
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

                    {/* Submit vote button */}
                    {!showResults && poll.isActive && (
                      <Button
                        onClick={() => handleSubmitVote(poll.id)}
                        disabled={pending.length === 0 || isSubmitting}
                        data-ocid={`polls.submit_button.${idx + 1}`}
                        className="w-full mt-3 h-10 rounded-xl font-semibold text-white text-sm"
                        style={{ backgroundColor: "#FF4500" }}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Submit Vote
                        {pending.length > 0 ? ` (${pending.length})` : ""}
                      </Button>
                    )}

                    {poll.hasVoted && poll.isActive && (
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
        data-ocid="polls.open_modal_button"
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
              data-ocid="polls.modal"
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
                  data-ocid="polls.close_button"
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
                  data-ocid="polls.input"
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
                  data-ocid="polls.cancel_button"
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePoll}
                  disabled={
                    creating ||
                    !newPoll.title.trim() ||
                    newPoll.options.filter((o) => o.trim()).length < 2
                  }
                  data-ocid="polls.submit_button"
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
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
