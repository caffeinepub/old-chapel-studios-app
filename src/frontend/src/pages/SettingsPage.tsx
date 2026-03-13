import { AppUserRole, type UserProfile, UserStatus } from "@/backend";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { Bell, Edit3, LogOut, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

type SettingsSection = "main" | "edit-profile";

interface DisplayProfile {
  displayName: string;
  role: string;
  avatarInitials: string;
}

export default function SettingsPage() {
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const [section, setSection] = useState<SettingsSection>("main");
  const [currentUser, setCurrentUser] = useState<DisplayProfile>({
    displayName: "",
    role: "",
    avatarInitials: "",
  });
  const [backendProfile, setBackendProfile] = useState<UserProfile | null>(
    null,
  );
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [notifications, setNotifications] = useState({
    posts: true,
    events: true,
    polls: true,
    chats: true,
  });

  const [editForm, setEditForm] = useState({
    displayName: "",
    phone: "",
    shareContact: false,
  });

  useEffect(() => {
    if (!actor) return;
    actor
      .getCallerUserProfile()
      .then((profile) => {
        if (profile) {
          const initials = profile.displayName
            ? profile.displayName
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?";
          setCurrentUser({
            displayName: profile.displayName,
            role: profile.role,
            avatarInitials: initials,
          });
          setBackendProfile(profile);
          setEditForm({
            displayName: profile.displayName,
            phone: profile.phone ?? "",
            shareContact: profile.shareContact,
          });
        }
        setProfileLoaded(true);
      })
      .catch(() => {
        setProfileLoaded(true);
      });
  }, [actor]);

  const principalText = identity ? identity.getPrincipal().toText() : "";
  const principalShort =
    principalText.length > 20
      ? `${principalText.slice(0, 12)}...${principalText.slice(-6)}`
      : principalText;

  const handleSaveProfile = async () => {
    if (!actor || !backendProfile) return;
    try {
      const updated: UserProfile = {
        ...backendProfile,
        displayName: editForm.displayName,
        phone: editForm.phone || undefined,
        shareContact: editForm.shareContact,
      };
      await actor.saveCallerUserProfile(updated);
      setCurrentUser((p) => ({
        ...p,
        displayName: editForm.displayName,
        avatarInitials: editForm.displayName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      }));
      setBackendProfile(updated);
    } catch {
      // ignore
    }
    setSection("main");
  };

  const roleLabel = currentUser.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "Member";

  if (section === "edit-profile") {
    return (
      <div className="flex flex-col min-h-screen">
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
            Edit Profile
          </span>
        </header>

        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  {currentUser.avatarInitials}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Display Name</Label>
                  <Input
                    data-ocid="settings.edit.display_name.input"
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

                {principalText && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      Internet Identity
                    </Label>
                    <div
                      className="h-11 rounded-xl flex items-center px-3 font-mono text-xs text-muted-foreground select-all overflow-x-auto"
                      style={{
                        backgroundColor: "oklch(0.17 0.008 45)",
                        border: "1px solid oklch(0.25 0.01 45)",
                      }}
                      title={principalText}
                    >
                      {principalText}
                    </div>
                    <p className="text-xs text-muted-foreground/50">
                      Your unique identity on the Internet Computer. Read-only.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">
                    Phone (optional)
                  </Label>
                  <Input
                    data-ocid="settings.edit.phone.input"
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
                    data-ocid="settings.edit.share_contact.switch"
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
                data-ocid="settings.edit.save_button"
                onClick={handleSaveProfile}
                className="w-full h-12 rounded-xl font-semibold text-white mt-2"
                style={{ backgroundColor: "#FF4500" }}
              >
                Save Changes
              </Button>
            </div>
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border p-4"
            data-ocid="settings.profile.card"
            style={{
              backgroundColor: "oklch(0.17 0.01 45)",
              borderColor: "oklch(0.62 0.22 40 / 0.3)",
              background:
                "linear-gradient(135deg, oklch(0.17 0.01 45) 0%, oklch(0.19 0.015 40) 100%)",
            }}
          >
            {!profileLoaded ? (
              <div className="flex items-center gap-4 animate-pulse">
                <div
                  className="w-16 h-16 rounded-2xl flex-shrink-0"
                  style={{ backgroundColor: "oklch(0.25 0.01 45)" }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-5 w-36 rounded-lg"
                    style={{ backgroundColor: "oklch(0.25 0.01 45)" }}
                  />
                  <div
                    className="h-4 w-20 rounded-full"
                    style={{ backgroundColor: "oklch(0.22 0.01 45)" }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
                  style={{ backgroundColor: "#FF4500" }}
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
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                        color: "#FFA500",
                      }}
                    >
                      {roleLabel}
                    </span>
                  </div>
                  {principalShort && (
                    <p
                      className="text-xs text-muted-foreground/60 font-mono mt-0.5 truncate"
                      title={principalText}
                    >
                      {principalShort}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSection("edit-profile")}
                  data-ocid="settings.profile.edit_button"
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors flex-shrink-0"
                >
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </motion.div>

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
                    data-ocid={`settings.notifications.${key}.switch`}
                    checked={val}
                    onCheckedChange={(v) =>
                      setNotifications((p) => ({ ...p, [key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

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
                A community hub for Old Chapel Studios.
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={clear}
            data-ocid="settings.signout.button"
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

// Satisfy unused import warning — these are needed for UserProfile to typecheck correctly
void AppUserRole;
void UserStatus;
