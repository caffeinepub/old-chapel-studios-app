import type { Band, BandInvite, BandTask, Gig } from "@/backend";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  ChevronDown,
  Crown,
  Guitar,
  Loader2,
  Music,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PageState = "loading" | "no-band" | "pending-invite" | "in-band";

interface Member {
  principal: Principal;
  displayName: string;
}

const cardStyle = {
  backgroundColor: "oklch(0.17 0.01 45)",
  border: "1px solid oklch(0.28 0.015 45)",
};

const sectionHeadingStyle = {
  fontFamily: "'Outfit', sans-serif",
  color: "#FF4500",
};

export default function BandPage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [band, setBand] = useState<Band | null>(null);
  const [pendingInvite, setPendingInvite] = useState<BandInvite | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [tasks, setTasks] = useState<BandTask[]>([]);
  const [isLeader, setIsLeader] = useState(false);

  // Create band
  const [bandNameInput, setBandNameInput] = useState("");
  const [creating, setCreating] = useState(false);

  // Rename band
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Disband
  const [disbandConfirm, setDisbandConfirm] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  // Invite search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Gig form
  const [showAddGig, setShowAddGig] = useState(false);
  const [editGigId, setEditGigId] = useState<bigint | null>(null);
  const [gigForm, setGigForm] = useState({
    name: "",
    date: "",
    time: "",
    venue: "",
    notes: "",
  });
  const [savingGig, setSavingGig] = useState(false);
  const [deletingGigId, setDeletingGigId] = useState<bigint | null>(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [togglingTask, setTogglingTask] = useState<bigint | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<bigint | null>(null);

  const myPrincipal = identity?.getPrincipal().toString();

  const loadBandData = useCallback(async () => {
    if (!actor) return;
    try {
      const [bandResult, inviteResult] = await Promise.all([
        actor.getBand(),
        actor.getPendingInvite(),
      ]);

      if (bandResult) {
        setBand(bandResult);
        const leadPrincipal = bandResult.leaderId.toText();
        const amLeader = myPrincipal === leadPrincipal;
        setIsLeader(amLeader);

        try {
          const [membersResult, gigsResult, tasksResult] = await Promise.all([
            actor.getBandMembers(),
            actor.getGigs(),
            actor.getTasks(),
          ]);
          setMembers(
            membersResult.map(([p, name]) => ({
              principal: p,
              displayName: name,
            })),
          );
          setGigs(gigsResult);
          setTasks(tasksResult);
        } catch (_e) {
          // Show whatever loaded successfully — defaults already set
        }

        setPageState("in-band");
      } else if (inviteResult) {
        setPendingInvite(inviteResult);
        setPageState("pending-invite");
      } else {
        setPageState("no-band");
      }
    } catch (e) {
      toast.error(
        `Failed to load band data: ${e instanceof Error ? e.message : String(e)}`,
      );
      setPageState("no-band");
    }
  }, [actor, myPrincipal]);

  useEffect(() => {
    if (actorFetching) return;
    if (!actor) {
      setPageState("no-band");
      return;
    }
    loadBandData();
  }, [actor, actorFetching, loadBandData]);

  // Periodic polling when in-band
  useEffect(() => {
    if (pageState !== "in-band" || !actor) return;
    const interval = setInterval(() => {
      loadBandData();
    }, 10000);
    return () => clearInterval(interval);
  }, [pageState, actor, loadBandData]);

  // Search members debounced
  useEffect(() => {
    if (!searchQuery.trim() || !actor) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await actor.searchMembers(searchQuery);
        const memberPrincipals = new Set(
          members.map((m) => m.principal.toText()),
        );
        setSearchResults(
          results
            .filter(([p]) => !memberPrincipals.has(p.toText()))
            .map(([p, name]) => ({ principal: p, displayName: name })),
        );
      } catch (_e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery, actor, members]);

  const handleCreateBand = async () => {
    if (!actor || !bandNameInput.trim()) return;
    setCreating(true);
    try {
      await actor.createBand(bandNameInput.trim());
      toast.success("Band created!");
      await loadBandData();
    } catch (e) {
      toast.error(
        `Failed to create band: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!actor) return;
    try {
      await actor.acceptInvite();
      toast.success("Joined the band!");
      await loadBandData();
    } catch (e) {
      toast.error(
        `Failed to accept invite: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const handleDeclineInvite = async () => {
    if (!actor) return;
    try {
      await actor.declineInvite();
      toast.success("Invite declined");
      setPendingInvite(null);
      setPageState("no-band");
    } catch (e) {
      toast.error(
        `Failed to decline invite: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const handleRenameBand = async () => {
    if (!actor || !renameInput.trim()) return;
    setRenameSaving(true);
    try {
      await actor.renameBand(renameInput.trim());
      toast.success("Band renamed!");
      setRenaming(false);
      await loadBandData();
    } catch (e) {
      toast.error(
        `Failed to rename band: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setRenameSaving(false);
    }
  };

  const handleDisband = async () => {
    if (!actor) return;
    setDisbanding(true);
    try {
      await actor.disbandBand();
      toast.success("Band disbanded");
      setBand(null);
      setMembers([]);
      setGigs([]);
      setTasks([]);
      setDisbandConfirm(false);
      setPageState("no-band");
    } catch (e) {
      toast.error(
        `Failed to disband band: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDisbanding(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!actor) return;
    try {
      await actor.removeMember(member.principal);
      toast.success(`${member.displayName} removed`);
      await loadBandData();
    } catch (e) {
      toast.error(
        `Failed to remove member: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const handleInviteMember = async (member: Member) => {
    if (!actor) return;
    setInviting(member.principal.toText());
    try {
      await actor.inviteMember(member.principal);
      toast.success(`Invite sent to ${member.displayName}`);
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      await loadBandData();
    } catch (e) {
      toast.error(
        `Failed to send invite: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setInviting(null);
    }
  };

  const handleSaveGig = async () => {
    if (!actor || !gigForm.name || !gigForm.date || !gigForm.venue) return;
    setSavingGig(true);
    try {
      if (editGigId !== null) {
        await actor.editGig(
          editGigId,
          gigForm.name,
          gigForm.date,
          gigForm.time,
          gigForm.venue,
          gigForm.notes,
        );
        toast.success("Gig updated!");
      } else {
        await actor.addGig(
          gigForm.name,
          gigForm.date,
          gigForm.time,
          gigForm.venue,
          gigForm.notes,
        );
        toast.success("Gig added!");
      }
      setShowAddGig(false);
      setEditGigId(null);
      setGigForm({ name: "", date: "", time: "", venue: "", notes: "" });
      const updatedGigs = await actor.getGigs();
      setGigs(updatedGigs);
    } catch (e) {
      toast.error(
        `Failed to save gig: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setSavingGig(false);
    }
  };

  const handleDeleteGig = async (gigId: bigint) => {
    if (!actor) return;
    setDeletingGigId(gigId);
    try {
      await actor.deleteGig(gigId);
      toast.success("Gig deleted");
      const updatedGigs = await actor.getGigs();
      setGigs(updatedGigs);
    } catch (e) {
      toast.error(
        `Failed to delete gig: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDeletingGigId(null);
    }
  };

  const handleAddTask = async () => {
    if (!actor || !taskTitle.trim()) return;
    setAddingTask(true);
    try {
      await actor.addTask(taskTitle.trim(), taskDesc.trim());
      toast.success("Task added!");
      setTaskTitle("");
      setTaskDesc("");
      const updatedTasks = await actor.getTasks();
      setTasks(updatedTasks);
    } catch (e) {
      toast.error(
        `Failed to add task: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId: bigint) => {
    if (!actor) return;
    setTogglingTask(taskId);
    try {
      await actor.completeTask(taskId);
      const updatedTasks = await actor.getTasks();
      setTasks(updatedTasks);
    } catch (e) {
      toast.error(
        `Failed to update task: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setTogglingTask(null);
    }
  };

  const handleDeleteTask = async (taskId: bigint) => {
    if (!actor) return;
    setDeletingTaskId(taskId);
    try {
      await actor.deleteTask(taskId);
      toast.success("Task deleted");
      const updatedTasks = await actor.getTasks();
      setTasks(updatedTasks);
    } catch (e) {
      toast.error(
        `Failed to delete task: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Next upcoming gig
  const today = new Date().toISOString().split("T")[0];
  const upcomingGigs = gigs
    .filter((g) => g.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextGig = upcomingGigs[0] ?? null;

  // Sorted tasks: incomplete first
  const sortedTasks = [
    ...tasks
      .filter((t) => !t.completed)
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt)),
    ...tasks
      .filter((t) => t.completed)
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt)),
  ];

  if (pageState === "loading") {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Band" />
        <main className="flex-1 flex items-center justify-center pb-24">
          <div
            className="flex flex-col items-center gap-3"
            data-ocid="band.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#FF4500" }}
            />
            <p className="text-sm text-muted-foreground">Loading band…</p>
          </div>
        </main>
      </div>
    );
  }

  if (pageState === "no-band") {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Band" />
        <main className="flex-1 flex items-center justify-center pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-5"
            style={cardStyle}
            data-ocid="band.card"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
            >
              <Guitar className="w-8 h-8" style={{ color: "#FF4500" }} />
            </div>
            <div className="text-center">
              <h2
                className="font-bold text-xl mb-1"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                You're not in a band yet
              </h2>
              <p className="text-sm text-muted-foreground">
                Create a band to collaborate with your fellow musicians.
              </p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <Input
                placeholder="Band name…"
                value={bandNameInput}
                onChange={(e) => setBandNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBand()}
                data-ocid="band.input"
                className="h-11 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(0.20 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              />
              <Button
                onClick={handleCreateBand}
                disabled={creating || !bandNameInput.trim()}
                data-ocid="band.primary_button"
                className="h-11 rounded-xl font-semibold text-white w-full"
                style={{ backgroundColor: "#FF4500" }}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Band
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (pageState === "pending-invite" && pendingInvite) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Band" />
        <main className="flex-1 flex items-center justify-center pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-5"
            style={cardStyle}
            data-ocid="band.card"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
            >
              <Music className="w-8 h-8" style={{ color: "#FF4500" }} />
            </div>
            <div className="text-center">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "#FFA500" }}
              >
                Invite Received
              </p>
              <h2
                className="font-bold text-xl mb-1"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                You have a band invite!
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {pendingInvite.inviterName}
                </span>{" "}
                has invited you to join{" "}
                <span className="font-semibold" style={{ color: "#FF4500" }}>
                  {pendingInvite.bandName}
                </span>
                .
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <Button
                onClick={handleAcceptInvite}
                data-ocid="band.confirm_button"
                className="h-11 rounded-xl font-semibold text-white w-full"
                style={{ backgroundColor: "#FF4500" }}
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeclineInvite}
                data-ocid="band.cancel_button"
                className="h-11 rounded-xl font-semibold w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // In-band dashboard
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Band" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-5">
          {/* Band header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={cardStyle}
          >
            {renaming ? (
              <div className="flex gap-2 mb-4">
                <Input
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameBand()}
                  placeholder="New band name…"
                  data-ocid="band.input"
                  autoFocus
                  className="h-10 rounded-xl text-sm flex-1"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleRenameBand}
                  disabled={renameSaving || !renameInput.trim()}
                  data-ocid="band.save_button"
                  className="h-10 rounded-xl text-white px-3"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  {renameSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRenaming(false)}
                  className="h-10 rounded-xl px-3"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: "#FFA500" }}
                  >
                    Your Band
                  </p>
                  <h2
                    className="font-bold text-2xl"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {band?.name}
                  </h2>
                </div>
                {isLeader && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenameInput(band?.name ?? "");
                        setRenaming(true);
                      }}
                      data-ocid="band.edit_button"
                      className="h-8 rounded-lg text-xs px-3"
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDisbandConfirm(true)}
                      data-ocid="band.delete_button"
                      className="h-8 rounded-lg text-xs px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Disband
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Members */}
            <div className="mb-4">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "oklch(0.55 0.015 55)" }}
              >
                Members ({members.length})
              </p>
              <div className="flex flex-col gap-2">
                {members.map((member, idx) => {
                  const memberIsLeader =
                    band?.leaderId.toText() === member.principal.toText();
                  const isMe = myPrincipal === member.principal.toText();
                  return (
                    <div
                      key={member.principal.toText()}
                      data-ocid={`band.item.${idx + 1}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: "oklch(0.20 0.01 45)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                          style={{
                            backgroundColor: memberIsLeader
                              ? "#FF4500"
                              : "oklch(0.35 0.02 45)",
                          }}
                        >
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {member.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-muted-foreground">
                            (you)
                          </span>
                        )}
                        {memberIsLeader && (
                          <Crown
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: "#FFA500" }}
                          />
                        )}
                      </div>
                      {isLeader && !memberIsLeader && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          data-ocid={`band.delete_button.${idx + 1}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invite section */}
            {isLeader && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSearch((v) => !v)}
                  data-ocid="band.open_modal_button"
                  className="flex items-center gap-1.5 text-xs font-semibold mb-2 transition-colors"
                  style={{ color: "#FF4500" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Invite Member
                  <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{
                      transform: showSearch ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Input
                            placeholder="Search by display name…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            data-ocid="band.search_input"
                            className="h-10 rounded-xl text-sm pr-8"
                            style={{
                              backgroundColor: "oklch(0.20 0.01 45)",
                              borderColor: "oklch(0.28 0.015 45)",
                            }}
                          />
                          {searching && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          )}
                        </div>
                        {searchResults.length > 0 && (
                          <div
                            className="rounded-xl overflow-hidden"
                            style={{ border: "1px solid oklch(0.28 0.015 45)" }}
                          >
                            {searchResults.map((result) => {
                              const isInviting =
                                inviting === result.principal.toText();
                              return (
                                <button
                                  key={result.principal.toText()}
                                  type="button"
                                  onClick={() => handleInviteMember(result)}
                                  disabled={isInviting}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent/30 transition-colors text-left"
                                >
                                  <span className="font-medium">
                                    {result.displayName}
                                  </span>
                                  {isInviting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                  ) : (
                                    <span
                                      className="text-xs"
                                      style={{ color: "#FF4500" }}
                                    >
                                      Invite
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {searchQuery.trim() &&
                          !searching &&
                          searchResults.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No members found
                            </p>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Next Upcoming Gig */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5"
            style={cardStyle}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base" style={sectionHeadingStyle}>
                Next Upcoming Gig
              </h3>
              {isLeader && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditGigId(null);
                    setGigForm({
                      name: "",
                      date: "",
                      time: "",
                      venue: "",
                      notes: "",
                    });
                    setShowAddGig((v) => !v);
                  }}
                  data-ocid="band.open_modal_button"
                  className="h-8 rounded-lg text-xs px-3"
                  style={{ color: "#FF4500" }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Gig
                </Button>
              )}
            </div>

            {nextGig ? (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "oklch(0.20 0.01 45)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-sm"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {nextGig.name}
                    </p>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      <p className="text-xs text-muted-foreground">
                        📅{" "}
                        {new Date(
                          `${nextGig.date}T00:00:00`,
                        ).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {nextGig.time && ` · ${nextGig.time}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        📍 {nextGig.venue}
                      </p>
                      {nextGig.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {nextGig.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  {isLeader && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditGigId(nextGig.id);
                          setGigForm({
                            name: nextGig.name,
                            date: nextGig.date,
                            time: nextGig.time,
                            venue: nextGig.venue,
                            notes: nextGig.notes,
                          });
                          setShowAddGig(true);
                        }}
                        data-ocid="band.edit_button"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/30 transition-colors"
                        aria-label="Edit gig"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGig(nextGig.id)}
                        disabled={deletingGigId === nextGig.id}
                        data-ocid="band.delete_button"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors"
                        aria-label="Delete gig"
                      >
                        {deletingGigId === nextGig.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6" data-ocid="band.empty_state">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm text-muted-foreground">
                  No upcoming gigs
                </p>
                {isLeader && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add one above to get started
                  </p>
                )}
              </div>
            )}

            {/* Add/Edit gig form */}
            <AnimatePresence>
              {showAddGig && isLeader && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-4 flex flex-col gap-3 pt-4"
                    style={{ borderTop: "1px solid oklch(0.28 0.015 45)" }}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {editGigId ? "Edit Gig" : "New Gig"}
                    </p>
                    <Input
                      placeholder="Gig name *"
                      value={gigForm.name}
                      onChange={(e) =>
                        setGigForm((f) => ({ ...f, name: e.target.value }))
                      }
                      data-ocid="band.input"
                      className="h-10 rounded-xl text-sm"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={gigForm.date}
                        onChange={(e) =>
                          setGigForm((f) => ({ ...f, date: e.target.value }))
                        }
                        className="h-10 rounded-xl text-sm"
                        style={{
                          backgroundColor: "oklch(0.20 0.01 45)",
                          borderColor: "oklch(0.28 0.015 45)",
                        }}
                      />
                      <Input
                        type="time"
                        value={gigForm.time}
                        onChange={(e) =>
                          setGigForm((f) => ({ ...f, time: e.target.value }))
                        }
                        className="h-10 rounded-xl text-sm"
                        style={{
                          backgroundColor: "oklch(0.20 0.01 45)",
                          borderColor: "oklch(0.28 0.015 45)",
                        }}
                      />
                    </div>
                    <Input
                      placeholder="Venue *"
                      value={gigForm.venue}
                      onChange={(e) =>
                        setGigForm((f) => ({ ...f, venue: e.target.value }))
                      }
                      className="h-10 rounded-xl text-sm"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                    <Input
                      placeholder="Notes (optional)"
                      value={gigForm.notes}
                      onChange={(e) =>
                        setGigForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      className="h-10 rounded-xl text-sm"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowAddGig(false);
                          setEditGigId(null);
                        }}
                        data-ocid="band.cancel_button"
                        className="flex-1 h-10 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveGig}
                        disabled={
                          savingGig ||
                          !gigForm.name.trim() ||
                          !gigForm.date ||
                          !gigForm.venue.trim()
                        }
                        data-ocid="band.save_button"
                        className="flex-1 h-10 rounded-xl font-semibold text-white"
                        style={{ backgroundColor: "#FF4500" }}
                      >
                        {savingGig ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {editGigId ? "Save Changes" : "Add Gig"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Band Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={cardStyle}
          >
            <h3
              className="font-bold text-base mb-4"
              style={sectionHeadingStyle}
            >
              Band Tasks
            </h3>

            {/* Add task form */}
            <div className="flex flex-col gap-2 mb-4">
              <Input
                placeholder="New task title…"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleAddTask()
                }
                data-ocid="band.input"
                className="h-10 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(0.20 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              />
              <Textarea
                placeholder="Description (optional)…"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={2}
                data-ocid="band.textarea"
                className="rounded-xl text-sm resize-none"
                style={{
                  backgroundColor: "oklch(0.20 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              />
              <Button
                onClick={handleAddTask}
                disabled={addingTask || !taskTitle.trim()}
                data-ocid="band.primary_button"
                className="h-10 rounded-xl font-semibold text-white"
                style={{ backgroundColor: "#FF4500" }}
              >
                {addingTask ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Task
              </Button>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="text-center py-6" data-ocid="band.empty_state">
                <Check className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a task above to get started
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedTasks.map((task, idx) => {
                  const canDelete =
                    isLeader || task.creatorId.toText() === myPrincipal;
                  const isToggling = togglingTask === task.id;
                  const isDeleting = deletingTaskId === task.id;
                  return (
                    <motion.div
                      key={String(task.id)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      data-ocid={`band.item.${idx + 1}`}
                      className="flex items-start gap-3 px-3 py-3 rounded-xl"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        opacity: task.completed ? 0.65 : 1,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        disabled={isToggling}
                        data-ocid={`band.checkbox.${idx + 1}`}
                        className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: task.completed
                            ? "#FF4500"
                            : "oklch(0.35 0.015 45)",
                          backgroundColor: task.completed
                            ? "#FF4500"
                            : "transparent",
                        }}
                        aria-label={`Mark task ${task.completed ? "incomplete" : "complete"}`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                        ) : task.completed ? (
                          <Check className="w-2.5 h-2.5 text-white" />
                        ) : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium"
                          style={{
                            textDecoration: task.completed
                              ? "line-through"
                              : "none",
                            color: task.completed
                              ? "oklch(0.55 0.015 55)"
                              : "oklch(0.9 0.01 50)",
                          }}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={isDeleting}
                          data-ocid={`band.delete_button.${idx + 1}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0"
                          aria-label="Delete task"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Disband confirmation dialog */}
      <AnimatePresence>
        {disbandConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={(e) =>
              e.target === e.currentTarget && setDisbandConfirm(false)
            }
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              data-ocid="band.dialog"
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
              style={cardStyle}
            >
              <div>
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Disband {band?.name}?
                </h3>
                <p className="text-sm text-muted-foreground">
                  This will remove all members, gigs, and tasks. This cannot be
                  undone.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDisbandConfirm(false)}
                  data-ocid="band.cancel_button"
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDisband}
                  disabled={disbanding}
                  data-ocid="band.confirm_button"
                  className="flex-1 h-11 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600"
                >
                  {disbanding ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Disband
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
