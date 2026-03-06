import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CURRENT_USER,
  type GearItem,
  INITIAL_GEAR,
  INITIAL_INVITE_CODES,
  INITIAL_JOIN_REQUESTS,
  type JoinRequest,
  MOCK_USERS,
  type MockInviteCode,
  type MockUser,
  ROLE_COLORS,
  ROLE_LABELS,
} from "@/data/mockData";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  Bell,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type SettingsSection =
  | "main"
  | "edit-profile"
  | "admin-invites"
  | "admin-requests"
  | "admin-members"
  | "admin-gear";

export default function SettingsPage() {
  const { clear } = useInternetIdentity();
  const { actor } = useActor();
  const [section, setSection] = useState<SettingsSection>("main");
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);
  const [notifications, setNotifications] = useState({
    posts: true,
    events: true,
    polls: true,
    chats: true,
  });

  // Admin state
  const [isAdmin, setIsAdmin] = useState(true); // Mock: admin by default
  const [inviteCodes, setInviteCodes] =
    useState<MockInviteCode[]>(INITIAL_INVITE_CODES);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(
    INITIAL_JOIN_REQUESTS,
  );
  const [members, setMembers] = useState<MockUser[]>(MOCK_USERS);
  const [gear, setGear] = useState<GearItem[]>(INITIAL_GEAR);
  const [copiedCode, setCopiedCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);

  // Edit profile form
  const [editForm, setEditForm] = useState({
    displayName: currentUser.displayName,
    email: currentUser.email,
    phone: "",
    shareContact: false,
  });

  // Check admin status from backend
  useEffect(() => {
    if (actor) {
      actor
        .isCallerAdmin()
        .then(setIsAdmin)
        .catch(() => setIsAdmin(true));
    }
  }, [actor]);

  const handleGenerateInvite = async () => {
    setGeneratingCode(true);
    try {
      if (!actor) throw new Error("No actor");
      const code = await actor.generateInviteCode();
      const newCode: MockInviteCode = {
        code,
        created: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        used: false,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
      setInviteCodes((prev) => [newCode, ...prev]);
    } catch {
      // Fallback mock code
      const mockCode = `OCS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setInviteCodes((prev) => [
        {
          code: mockCode,
          created: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          used: false,
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        },
        ...prev,
      ]);
    }
    setGeneratingCode(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleApproveRequest = (reqId: string) => {
    setJoinRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "approved" } : r)),
    );
  };

  const handleDenyRequest = (reqId: string) => {
    setJoinRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "denied" } : r)),
    );
  };

  const handleChangeMemberRole = (memberId: string, role: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, role: role as MockUser["role"] } : m,
      ),
    );
  };

  const handleSaveProfile = () => {
    setCurrentUser((p) => ({
      ...p,
      displayName: editForm.displayName,
      email: editForm.email,
    }));
    setSection("main");
  };

  const handleGearStatusChange = (
    gearId: string,
    status: GearItem["status"],
  ) => {
    setGear((prev) =>
      prev.map((g) => (g.id === gearId ? { ...g, status } : g)),
    );
  };

  const handleDeleteGear = (gearId: string) => {
    setGear((prev) => prev.filter((g) => g.id !== gearId));
  };

  const GEAR_STATUS_COLORS: Record<GearItem["status"], string> = {
    available: "#22C55E",
    "in-use": "#FFA500",
    maintenance: "#EF4444",
  };

  // Sub-page rendering
  if (section !== "main") {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Sub-page header */}
        <header
          className="flex items-center gap-3 h-14 px-4 sticky top-0 z-40"
          style={{
            backgroundColor: "oklch(0.10 0.008 40 / 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid oklch(0.28 0.015 45)",
          }}
        >
          <button
            type="button"
            onClick={() => setSection("main")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {section === "edit-profile"
              ? "Edit Profile"
              : section === "admin-invites"
                ? "Invite Codes"
                : section === "admin-requests"
                  ? "Join Requests"
                  : section === "admin-members"
                    ? "Members"
                    : "Gear List"}
          </span>
        </header>

        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4">
            {/* Edit Profile */}
            {section === "edit-profile" && (
              <div className="flex flex-col gap-4">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    {currentUser.avatarInitials}
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium"
                    style={{ color: "#FF4500" }}
                  >
                    Change Photo
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">Display Name</Label>
                    <Input
                      value={editForm.displayName}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          displayName: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      Phone (optional)
                    </Label>
                    <Input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+44 7700 000000"
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="share-contact"
                      checked={editForm.shareContact}
                      onCheckedChange={(v) =>
                        setEditForm((p) => ({ ...p, shareContact: v }))
                      }
                    />
                    <Label htmlFor="share-contact" className="text-sm">
                      Share contact details with members
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  className="w-full h-12 rounded-xl font-semibold text-white mt-2"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  Save Changes
                </Button>
              </div>
            )}

            {/* Invite Codes */}
            {section === "admin-invites" && (
              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleGenerateInvite}
                  disabled={generatingCode}
                  data-ocid="admin.generate_invite.button"
                  className="w-full h-12 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  {generatingCode ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Generate New Invite Code
                </Button>

                <div className="space-y-2">
                  {inviteCodes.map((ic, idx) => (
                    <div
                      key={ic.code}
                      data-ocid={`admin.invite_code.item.${idx + 1}`}
                      className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{
                        backgroundColor: "oklch(0.17 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                        opacity: ic.used ? 0.6 : 1,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-mono text-sm font-bold"
                          style={{
                            color: ic.used ? "oklch(0.55 0.015 55)" : "#FF4500",
                          }}
                        >
                          {ic.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {ic.created}
                          {ic.expiresAt && ` · Expires ${ic.expiresAt}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: ic.used
                              ? "oklch(0.28 0.015 45)"
                              : "oklch(0.55 0.17 142 / 0.2)",
                            color: ic.used ? "oklch(0.55 0.015 55)" : "#22C55E",
                          }}
                        >
                          {ic.used ? "Used" : "Active"}
                        </span>
                        {!ic.used && (
                          <button
                            type="button"
                            onClick={() => handleCopyCode(ic.code)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                          >
                            {copiedCode === ic.code ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Join Requests */}
            {section === "admin-requests" && (
              <div className="space-y-3">
                {joinRequests.filter((r) => r.status === "pending").length ===
                  0 && (
                  <div
                    className="text-center py-8 text-muted-foreground rounded-xl border"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                )}

                {joinRequests.map((req, idx) => (
                  <motion.div
                    key={req.id}
                    data-ocid={`admin.join_request.item.${idx + 1}`}
                    layout
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor:
                        req.status === "pending"
                          ? "oklch(0.28 0.015 45)"
                          : req.status === "approved"
                            ? "oklch(0.55 0.17 142 / 0.3)"
                            : "oklch(0.55 0.22 22 / 0.3)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {req.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Role: {req.reason} · {req.requestedAt}
                        </p>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor:
                            req.status === "pending"
                              ? "oklch(0.65 0.18 60 / 0.2)"
                              : req.status === "approved"
                                ? "oklch(0.55 0.17 142 / 0.2)"
                                : "oklch(0.55 0.22 22 / 0.2)",
                          color:
                            req.status === "pending"
                              ? "#FFA500"
                              : req.status === "approved"
                                ? "#22C55E"
                                : "#EF4444",
                        }}
                      >
                        {req.status.charAt(0).toUpperCase() +
                          req.status.slice(1)}
                      </span>
                    </div>

                    {req.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => handleApproveRequest(req.id)}
                          data-ocid={`admin.approve.button.${idx + 1}`}
                          size="sm"
                          className="flex-1 h-9 rounded-xl font-medium text-white"
                          style={{ backgroundColor: "#22C55E" }}
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          onClick={() => handleDenyRequest(req.id)}
                          data-ocid={`admin.deny.button.${idx + 1}`}
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-9 rounded-xl font-medium"
                          style={{
                            backgroundColor: "oklch(0.55 0.22 22 / 0.1)",
                            color: "#EF4444",
                          }}
                        >
                          ✕ Deny
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Members */}
            {section === "admin-members" && (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">
                          {member.displayName}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role]}`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    {member.id !== "user-1" && (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleChangeMemberRole(member.id, v)
                        }
                      >
                        <SelectTrigger
                          className="w-24 h-8 text-xs rounded-lg"
                          style={{
                            backgroundColor: "oklch(0.22 0.01 45)",
                            borderColor: "oklch(0.28 0.015 45)",
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="musician">Musician</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Gear List */}
            {section === "admin-gear" && (
              <div className="space-y-2">
                {gear.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: GEAR_STATUS_COLORS[item.status],
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {item.category}
                        </span>
                        {item.notes && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            · {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Select
                        value={item.status}
                        onValueChange={(v) =>
                          handleGearStatusChange(
                            item.id,
                            v as GearItem["status"],
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-8 text-[10px] rounded-lg px-2"
                          style={{
                            backgroundColor: "oklch(0.22 0.01 45)",
                            borderColor: "oklch(0.28 0.015 45)",
                            color: GEAR_STATUS_COLORS[item.status],
                            minWidth: "80px",
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in-use">In Use</SelectItem>
                          <SelectItem value="maintenance">
                            Maintenance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => handleDeleteGear(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // === Main Settings Screen ===
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Settings" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          {/* Profile Card */}
          <div
            className="rounded-xl border p-4 flex items-center gap-4"
            style={{
              backgroundColor: "oklch(0.17 0.01 45)",
              borderColor: "oklch(0.62 0.22 40 / 0.3)",
              background:
                "linear-gradient(135deg, oklch(0.17 0.01 45) 0%, oklch(0.19 0.015 40) 100%)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-orange"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-black text-lg truncate"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {currentUser.displayName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[currentUser.role]}`}
                >
                  {ROLE_LABELS[currentUser.role]}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {currentUser.email}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSection("edit-profile")}
              data-ocid="settings.profile.edit.button"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors flex-shrink-0"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Notifications
            </h3>
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                borderColor: "oklch(0.28 0.015 45)",
              }}
            >
              {Object.entries(notifications).map(([key, val], idx, arr) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4"
                  style={{
                    borderBottom:
                      idx < arr.length - 1
                        ? "1px solid oklch(0.22 0.01 45)"
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm capitalize">{key}</span>
                  </div>
                  <Switch
                    checked={val}
                    onCheckedChange={(v) =>
                      setNotifications((p) => ({ ...p, [key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Admin Tools — only visible to admins */}
          {isAdmin && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Admin Tools
              </h3>
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  borderColor: "oklch(0.62 0.22 40 / 0.25)",
                }}
              >
                {/* Admin header */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{
                    backgroundColor: "oklch(0.62 0.22 40 / 0.1)",
                    borderBottom: "1px solid oklch(0.62 0.22 40 / 0.2)",
                  }}
                >
                  <Shield className="w-4 h-4" style={{ color: "#FF4500" }} />
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#FF4500" }}
                  >
                    Admin Panel
                  </span>
                </div>

                {[
                  {
                    id: "admin-invites" as SettingsSection,
                    icon: "🔑",
                    label: "Invite Codes",
                    sub: `${inviteCodes.filter((c) => !c.used).length} active`,
                  },
                  {
                    id: "admin-requests" as SettingsSection,
                    icon: "📬",
                    label: "Join Requests",
                    sub: `${joinRequests.filter((r) => r.status === "pending").length} pending`,
                    badge: joinRequests.filter((r) => r.status === "pending")
                      .length,
                  },
                  {
                    id: "admin-members" as SettingsSection,
                    icon: "👥",
                    label: "Members",
                    sub: `${members.length} members`,
                  },
                  {
                    id: "admin-gear" as SettingsSection,
                    icon: "🎸",
                    label: "Gear List",
                    sub: `${gear.length} items`,
                  },
                ].map((item, idx, arr) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left"
                    style={{
                      borderBottom:
                        idx < arr.length - 1
                          ? "1px solid oklch(0.22 0.01 45)"
                          : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge ? (
                        <span
                          className="w-5 h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                          style={{ backgroundColor: "#FF4500" }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              About
            </h3>
            <div
              className="rounded-xl border p-4 space-y-2"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                borderColor: "oklch(0.28 0.015 45)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0">
                  <img
                    src="/assets/generated/chapel-icon-transparent.dim_512x512.png"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Old Chapel Studios App
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version 1.0.0 · Leeds, UK
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A private community hub for Old Chapel Studios staff, musicians,
                and clients. Invite-only.
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={clear}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            style={{ borderColor: "oklch(0.28 0.015 45)" }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/40 pb-2">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.hostname : "",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
