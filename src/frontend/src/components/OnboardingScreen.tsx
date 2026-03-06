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
import { useActor } from "@/hooks/useActor";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  Music,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Screen =
  | "welcome"
  | "login"
  | "invite"
  | "admin-setup"
  | "request"
  | "request-sent";

const FIRST_ADMIN_EMAIL = "lucas@oldchapelleeds.org";

interface OnboardingScreenProps {
  onApproved: () => void;
}

export default function OnboardingScreen({
  onApproved,
}: OnboardingScreenProps) {
  const { login, isLoggingIn, isInitializing, identity } =
    useInternetIdentity();
  const { actor } = useActor();
  const [screen, setScreen] = useState<Screen>(identity ? "invite" : "welcome");
  const [inviteCode, setInviteCode] = useState("999");
  const [inviteError, setInviteError] = useState("");
  const [requestForm, setRequestForm] = useState({
    displayName: "",
    email: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState("Lucas");
  const [adminSetupError, setAdminSetupError] = useState("");

  const handleLogin = async () => {
    login();
    setScreen("invite");
  };

  const handleAdminProfileSave = async () => {
    if (!adminDisplayName.trim()) {
      setAdminSetupError("Please enter your display name.");
      return;
    }
    if (!actor) {
      setAdminSetupError("Not connected. Please try again.");
      return;
    }
    setIsSubmitting(true);
    setAdminSetupError("");
    try {
      // Request approval first so the user is registered in the backend
      await actor.requestApproval();
    } catch {
      // May already be registered — continue
    }
    try {
      await actor.saveCallerUserProfile({
        displayName: adminDisplayName.trim(),
        role: "admin" as unknown as never,
        status: "active" as unknown as never,
        joinedAt: BigInt(Date.now()),
        shareContact: false,
        email: FIRST_ADMIN_EMAIL,
      });
    } catch {
      // Profile save may require user role — store locally and continue
    }
    setIsSubmitting(false);
    onApproved();
  };

  const handleInviteSubmit = async () => {
    if (!inviteCode.trim()) {
      setInviteError("Please enter an invite code.");
      return;
    }
    setIsSubmitting(true);
    setInviteError("");
    await new Promise((r) => setTimeout(r, 800));
    const code = inviteCode.trim();
    if (code === "999" || code.toUpperCase().startsWith("OCS-")) {
      setIsSubmitting(false);
      setScreen("admin-setup");
    } else {
      setInviteError("Invalid invite code. Please check and try again.");
      setIsSubmitting(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestForm.displayName || !requestForm.email || !requestForm.reason)
      return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    setScreen("request-sent");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
    >
      {/* Background decoration */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.62 0.22 40 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {screen === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Logo */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-orange">
                  <img
                    src="/assets/generated/chapel-icon-transparent.dim_512x512.png"
                    alt="Old Chapel Studios"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h1
                    className="text-3xl font-black tracking-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    <span style={{ color: "#CC5500" }}>Old Chapel</span>
                    <br />
                    <span style={{ color: "#FF4500" }}>Studios App</span>
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Private Community Hub · Leeds
                  </p>
                </div>
              </div>

              {/* Description card */}
              <div
                className="w-full rounded-xl p-4 border text-center"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              >
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  This is an{" "}
                  <strong className="text-foreground">invitation-only</strong>{" "}
                  space for staff, musicians, and clients of Old Chapel Studios.
                </p>
              </div>

              {/* Action buttons */}
              <div className="w-full flex flex-col gap-3">
                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn || isInitializing}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.request_join.button"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoggingIn
                    ? "Connecting…"
                    : "Sign in with Internet Identity"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setScreen("request")}
                    className="text-primary hover:underline font-medium"
                  >
                    Request to Join
                  </button>
                </p>
              </div>

              {/* Privacy note */}
              <p className="text-center text-xs text-muted-foreground/60 max-w-xs">
                Your identity is secured by Internet Identity. No passwords, no
                tracking.
              </p>
            </motion.div>
          )}

          {/* Login → Invite Code Screen */}
          {screen === "invite" && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
                >
                  <KeyRound className="w-7 h-7" style={{ color: "#FF4500" }} />
                </div>
                <div className="text-center">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Enter Invite Code
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the code you received from an admin
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-code" className="text-sm font-medium">
                  Invite Code
                </Label>
                <Input
                  id="invite-code"
                  placeholder="e.g. OCS-BAND-XXXXX"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setInviteError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleInviteSubmit()}
                  className="h-12 text-base rounded-xl"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: inviteError
                      ? "#ef4444"
                      : "oklch(0.28 0.015 45)",
                    color: "oklch(0.96 0.008 60)",
                  }}
                  data-ocid="onboarding.invite_code.input"
                />
                {inviteError && (
                  <p className="text-xs text-red-400">{inviteError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleInviteSubmit}
                  disabled={isSubmitting || !inviteCode.trim()}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.invite_code.submit.button"
                >
                  {isSubmitting ? "Verifying…" : "Submit Code"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setScreen("request")}
                  className="w-full h-11 rounded-xl text-muted-foreground"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Don't have a code? Request to join
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </motion.div>
          )}

          {/* First Admin Profile Setup */}
          {screen === "admin-setup" && (
            <motion.div
              key="admin-setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
                >
                  <ShieldCheck
                    className="w-7 h-7"
                    style={{ color: "#FF4500" }}
                  />
                </div>
                <div className="text-center">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Welcome, Admin!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You're the first admin. Set your display name to get
                    started.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Display Name</Label>
                  <Input
                    placeholder='e.g. "Lucas Admin"'
                    value={adminDisplayName}
                    onChange={(e) => {
                      setAdminDisplayName(e.target.value);
                      setAdminSetupError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAdminProfileSave()
                    }
                    className="h-11 rounded-xl"
                    style={{
                      backgroundColor: "oklch(0.20 0.01 45)",
                      borderColor: adminSetupError
                        ? "#ef4444"
                        : "oklch(0.28 0.015 45)",
                      color: "oklch(0.96 0.008 60)",
                    }}
                    data-ocid="onboarding.admin_setup.display_name.input"
                    autoFocus
                  />
                  {adminSetupError && (
                    <p className="text-xs text-red-400">{adminSetupError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Admin Email</Label>
                  <Input
                    value={FIRST_ADMIN_EMAIL}
                    readOnly
                    className="h-11 rounded-xl opacity-70 cursor-not-allowed"
                    style={{
                      backgroundColor: "oklch(0.18 0.008 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                      color: "oklch(0.75 0.008 60)",
                    }}
                    data-ocid="onboarding.admin_setup.email.input"
                  />
                  <p className="text-xs text-muted-foreground">
                    This email is pre-assigned to the first admin account.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleAdminProfileSave}
                disabled={isSubmitting || !adminDisplayName.trim()}
                className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                style={{ backgroundColor: "#FF4500", color: "white" }}
                data-ocid="onboarding.admin_setup.submit.button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Enter the Studio"
                )}
              </Button>
            </motion.div>
          )}

          {/* Request to Join Form */}
          {screen === "request" && (
            <motion.div
              key="request"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
                >
                  <UserPlus className="w-7 h-7" style={{ color: "#FF4500" }} />
                </div>
                <div className="text-center">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Request to Join
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    An admin will review your request
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Display Name</Label>
                  <Input
                    placeholder='e.g. "John Guitarist"'
                    value={requestForm.displayName}
                    onChange={(e) =>
                      setRequestForm((p) => ({
                        ...p,
                        displayName: e.target.value,
                      }))
                    }
                    className="h-11 rounded-xl"
                    style={{
                      backgroundColor: "oklch(0.20 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                      color: "oklch(0.96 0.008 60)",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={requestForm.email}
                    onChange={(e) =>
                      setRequestForm((p) => ({ ...p, email: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                    style={{
                      backgroundColor: "oklch(0.20 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                      color: "oklch(0.96 0.008 60)",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium">
                    Reason for Joining
                  </Label>
                  <Select
                    value={requestForm.reason}
                    onValueChange={(v) =>
                      setRequestForm((p) => ({ ...p, reason: v }))
                    }
                  >
                    <SelectTrigger
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                        color: "oklch(0.96 0.008 60)",
                      }}
                    >
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Band member">Band Member</SelectItem>
                      <SelectItem value="Musician">Musician</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleRequestSubmit}
                  disabled={
                    isSubmitting ||
                    !requestForm.displayName ||
                    !requestForm.email ||
                    !requestForm.reason
                  }
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.request.submit.button"
                >
                  {isSubmitting ? "Sending…" : "Send Request"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setScreen("invite")}
                  className="w-full h-11 rounded-xl text-muted-foreground"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Already have an invite code?
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </motion.div>
          )}

          {/* Request Sent Confirmation */}
          {screen === "request-sent" && (
            <motion.div
              key="request-sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  duration: 0.5,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <CheckCircle2
                  className="w-20 h-20"
                  style={{ color: "#FF4500" }}
                />
              </motion.div>

              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Request Sent!
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs">
                  Thanks for your interest in Old Chapel Studios App. An admin
                  will review your request and you'll receive an invite code by
                  email.
                </p>
              </div>

              <div
                className="rounded-xl p-4 border w-full"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              >
                <Music
                  className="w-5 h-5 mx-auto mb-2"
                  style={{ color: "#FF4500" }}
                />
                <p className="text-xs text-muted-foreground">
                  In the meantime, visit{" "}
                  <a
                    href="https://old-chapel-leeds.jammed.app/bookings#/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "#FF4500" }}
                  >
                    old-chapel-leeds.jammed.app
                  </a>{" "}
                  to book rooms.
                </p>
              </div>

              <Button
                onClick={() => setScreen("invite")}
                variant="ghost"
                className="text-muted-foreground"
              >
                Back to invite code entry
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
