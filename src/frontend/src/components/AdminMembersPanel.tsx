import { AppUserRole, type UserProfile, UserStatus } from "@/backend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import type { Principal } from "@icp-sdk/core/principal";
import { Ban, ShieldOff, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
  principal: Principal;
  profile: UserProfile;
};

type PendingAction =
  | { type: "ban"; member: Member }
  | { type: "unban"; member: Member }
  | { type: "remove"; member: Member }
  | null;

function getRoleLabel(role: AppUserRole): string {
  switch (role) {
    case AppUserRole.admin:
      return "Admin";
    case AppUserRole.staff:
      return "Staff";
    case AppUserRole.musician:
      return "Musician";
    case AppUserRole.client:
      return "Client";
    default:
      return "Member";
  }
}

function formatDate(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminMembersPanel() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [confirming, setConfirming] = useState(false);

  const myPrincipal = identity?.getPrincipal().toText();

  const fetchMembers = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const all = await actor.getAllUsers();
      setMembers(all.map(([principal, profile]) => ({ principal, profile })));
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const isProtected = (member: Member): boolean => {
    // Admins cannot be actioned
    if (member.profile.role === AppUserRole.admin) return true;
    // You cannot action yourself
    if (member.principal.toText() === myPrincipal) return true;
    return false;
  };

  const handleConfirm = async () => {
    if (!actor || !pendingAction) return;
    setConfirming(true);
    try {
      const { type, member } = pendingAction;
      let result = "";
      if (type === "ban") {
        result = await actor.banUser(member.principal);
      } else if (type === "unban") {
        result = await actor.unbanUser(member.principal);
      } else if (type === "remove") {
        result = await actor.removeUser(member.principal);
      }
      if (result && result !== "ok" && result !== "") {
        toast.error(result);
      } else {
        const actionLabel =
          type === "ban" ? "banned" : type === "unban" ? "unbanned" : "removed";
        toast.success(`${member.profile.displayName} has been ${actionLabel}.`);
        await fetchMembers();
      }
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setConfirming(false);
      setPendingAction(null);
    }
  };

  const dialogTitle = pendingAction
    ? pendingAction.type === "ban"
      ? `Ban ${pendingAction.member.profile.displayName}?`
      : pendingAction.type === "unban"
        ? `Unban ${pendingAction.member.profile.displayName}?`
        : `Remove ${pendingAction.member.profile.displayName}?`
    : "";

  const dialogDescription = pendingAction
    ? pendingAction.type === "ban"
      ? `${pendingAction.member.profile.displayName} will be banned from the app and won't be able to access it.`
      : pendingAction.type === "unban"
        ? `${pendingAction.member.profile.displayName} will be unbanned and regain access to the app.`
        : `This will permanently delete ${pendingAction.member.profile.displayName}'s account. This cannot be undone.`
    : "";

  return (
    <section data-ocid="admin.members.panel">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" style={{ color: "#FFA500" }} />
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#FFA500" }}
        >
          Members
        </h3>
        {!loading && (
          <span
            className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
              color: "#FFA500",
            }}
          >
            {members.length}
          </span>
        )}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "oklch(0.17 0.01 45)",
          borderColor: "oklch(0.28 0.015 45)",
        }}
        data-ocid="admin.members.list"
      >
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div
            className="py-10 text-center text-sm text-muted-foreground"
            data-ocid="admin.members.empty_state"
          >
            No members registered yet.
          </div>
        ) : (
          members.map((member, idx) => {
            const isBanned = member.profile.status === UserStatus.banned;
            const protected_ = isProtected(member);
            const ocidIdx = idx + 1;

            return (
              <div
                key={member.principal.toText()}
                data-ocid={`admin.members.item.${ocidIdx}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    idx < members.length - 1
                      ? "1px solid oklch(0.22 0.01 45)"
                      : "none",
                }}
              >
                {/* Avatar */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {member.profile.avatarUrl ? (
                    <img
                      src={member.profile.avatarUrl}
                      alt={member.profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-sm font-bold text-white"
                    style={{ backgroundColor: "#FF4500" }}
                  >
                    {getInitials(member.profile.displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">
                      {member.profile.displayName}
                    </span>
                    {isBanned && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        Banned
                      </Badge>
                    )}
                    {!isBanned && (
                      <Badge
                        className="text-[10px] px-1.5 py-0 h-4"
                        style={{
                          backgroundColor: "oklch(0.55 0.18 145 / 0.2)",
                          color: "oklch(0.75 0.18 145)",
                          border: "none",
                        }}
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs"
                      style={{ color: "#FFA500", opacity: 0.8 }}
                    >
                      {getRoleLabel(member.profile.role)}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      · Joined {formatDate(member.profile.joinedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!protected_ && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isBanned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`admin.members.ban_button.${ocidIdx}`}
                        onClick={() =>
                          setPendingAction({ type: "unban", member })
                        }
                        className="h-8 px-2.5 text-xs rounded-lg font-medium border"
                        style={{
                          borderColor: "oklch(0.55 0.18 145 / 0.4)",
                          color: "oklch(0.75 0.18 145)",
                          backgroundColor: "oklch(0.55 0.18 145 / 0.1)",
                        }}
                      >
                        <ShieldOff className="w-3.5 h-3.5 mr-1" />
                        Unban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`admin.members.ban_button.${ocidIdx}`}
                        onClick={() =>
                          setPendingAction({ type: "ban", member })
                        }
                        className="h-8 px-2.5 text-xs rounded-lg font-medium border"
                        style={{
                          borderColor: "oklch(0.75 0.18 50 / 0.4)",
                          color: "oklch(0.80 0.18 50)",
                          backgroundColor: "oklch(0.75 0.18 50 / 0.1)",
                        }}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Ban
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      data-ocid={`admin.members.delete_button.${ocidIdx}`}
                      onClick={() =>
                        setPendingAction({ type: "remove", member })
                      }
                      className="h-8 px-2.5 text-xs rounded-lg font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !confirming) setPendingAction(null);
        }}
      >
        <DialogContent
          data-ocid="admin.members.dialog"
          style={{
            backgroundColor: "oklch(0.17 0.01 45)",
            borderColor: "oklch(0.28 0.015 45)",
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              data-ocid="admin.members.cancel_button"
              onClick={() => setPendingAction(null)}
              disabled={confirming}
              style={{
                borderColor: "oklch(0.28 0.015 45)",
              }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.members.confirm_button"
              onClick={handleConfirm}
              disabled={confirming}
              variant={
                pendingAction?.type === "remove" ? "destructive" : "default"
              }
              style={
                pendingAction?.type !== "remove"
                  ? { backgroundColor: "#FF4500" }
                  : undefined
              }
            >
              {confirming
                ? "Processing…"
                : pendingAction?.type === "ban"
                  ? "Yes, Ban"
                  : pendingAction?.type === "unban"
                    ? "Yes, Unban"
                    : "Yes, Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
