import { AppUserRole, UserStatus } from "@/backend";
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
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  Music,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Screen =
  | "welcome"
  | "checking"
  | "bootstrap-admin"
  | "invite"
  | "profile-setup"
  | "request"
  | "request-sent";

interface OnboardingScreenProps {
  onApproved: () => void;
}

export default function OnboardingScreen({
  onApproved,
}: OnboardingScreenProps) {
  const { login, isLoggingIn, isInitializing, loginStatus, identity } =
    useInternetIdentity();
  const { actor } = useActor();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");
  const [profileSetupError, setProfileSetupError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bootstrapAvatarInputRef = useRef<HTMLInputElement>(null);
  const [requestForm, setRequestForm] = useState({
    displayName: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const loginInitiatedRef = useRef(false);

  // Keep a ref to always have the latest actor value in async closures
  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  // React to actor becoming available after login
  useEffect(() => {
    if (screen !== "checking") return;

    if (loginStatus === "logging-in") {
      loginInitiatedRef.current = false;
      return;
    }

    if (loginStatus === "loginError") {
      if (loginInitiatedRef.current) return;
      setLoginError("Login failed. Please try again.");
      setScreen("welcome");
      return;
    }

    if (!actor) return;

    const checkAccess = async () => {
      try {
        const [approved, isAdmin] = await Promise.all([
          actor.isCallerApproved(),
          actor.isCallerAdmin(),
        ]);
        if (approved || isAdmin) {
          onApproved();
          return;
        }
        // Not registered yet — check if an admin already exists
        let adminAssigned = false;
        try {
          adminAssigned = await (actor as any).isAdminAssigned();
        } catch {
          // If the method doesn't exist, assume admin is not yet assigned
          adminAssigned = false;
        }
        if (!adminAssigned) {
          // First ever login — bootstrap this principal as admin
          setScreen("bootstrap-admin");
        } else {
          // Admin exists — require invite code
          setScreen("invite");
        }
      } catch {
        setLoginError("Could not verify your account. Please try again.");
        setScreen("welcome");
      }
    };

    checkAccess();
  }, [screen, actor, loginStatus, onApproved]);

  const handleLogin = () => {
    setLoginError("");
    if (identity) {
      setScreen("checking");
      return;
    }
    loginInitiatedRef.current = true;
    login();
    setScreen("checking");
  };

  const handleJoinWithCode = async () => {
    await login();
    setScreen("invite");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleInviteSubmit = () => {
    if (!inviteCode.trim()) {
      setInviteError("Please enter an invite code.");
      return;
    }
    setInviteError("");
    setScreen("profile-setup");
  };

  const handleBootstrapAdmin = async () => {
    if (!displayName.trim()) {
      setDisplayNameError("Your name is required to activate your account.");
      return;
    }
    const currentActor = actorRef.current;
    if (!currentActor) {
      setProfileSetupError("Not connected. Please try again.");
      return;
    }
    setIsSubmitting(true);
    setProfileSetupError("");
    setDisplayNameError("");
    try {
      // Candid optional: [] means None, [value] means Some(value)
      const avatarArg: [] | [string] = avatarBase64 ? [avatarBase64] : [];
      await (currentActor as any).bootstrapAdmin(displayName.trim(), avatarArg);
      onApproved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already") || msg.includes("Already")) {
        // Admin already bootstrapped — try logging in normally
        onApproved();
      } else {
        setProfileSetupError(
          "Could not activate admin account. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSetup = async () => {
    if (!displayName.trim()) {
      setDisplayNameError("Your name is required to continue.");
      return;
    }
    const currentActor = actorRef.current;
    if (!currentActor) {
      setProfileSetupError("Not connected. Please try again.");
      return;
    }
    setIsSubmitting(true);
    setProfileSetupError("");
    setDisplayNameError("");
    try {
      await currentActor.requestApproval();
      await currentActor.saveCallerUserProfile({
        displayName: displayName.trim(),
        role: AppUserRole.musician,
        status: UserStatus.active,
        joinedAt: BigInt(Date.now()),
        shareContact: false,
        avatarUrl: avatarBase64 ?? undefined,
        email: undefined,
        phone: undefined,
      });
      onApproved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Invalid") || msg.includes("invalid")) {
        setProfileSetupError(
          "Invalid invite code. Please go back and check it.",
        );
      } else if (msg.includes("already") || msg.includes("Already")) {
        onApproved();
      } else {
        setProfileSetupError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestForm.displayName || !requestForm.reason) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    setScreen("request-sent");
  };

  const inputStyle = {
    backgroundColor: "oklch(0.20 0.01 45)",
    borderColor: "oklch(0.28 0.015 45)",
    color: "oklch(0.96 0.008 60)",
  };

  const inputProps = {
    autoComplete: "off" as const,
    autoCorrect: "off" as const,
    autoCapitalize: "off" as const,
    spellCheck: false,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
    >
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

              {loginError && (
                <div
                  className="w-full rounded-lg p-3 border text-sm text-red-400 text-center"
                  style={{
                    backgroundColor: "oklch(0.18 0.02 15)",
                    borderColor: "oklch(0.35 0.06 15)",
                  }}
                  data-ocid="onboarding.login.error_state"
                >
                  {loginError}
                </div>
              )}

              <div className="w-full flex flex-col gap-3">
                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn || isInitializing}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.login.primary_button"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>

                <div
                  className="flex items-center gap-3"
                  style={{ color: "oklch(0.50 0.01 60)" }}
                >
                  <div
                    className="flex-1 h-px"
                    style={{ backgroundColor: "oklch(0.28 0.015 45)" }}
                  />
                  <span className="text-xs">new here?</span>
                  <div
                    className="flex-1 h-px"
                    style={{ backgroundColor: "oklch(0.28 0.015 45)" }}
                  />
                </div>

                <Button
                  onClick={handleJoinWithCode}
                  disabled={isLoggingIn || isInitializing}
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  style={{
                    borderColor: "oklch(0.35 0.015 45)",
                    backgroundColor: "transparent",
                    color: "oklch(0.80 0.01 60)",
                  }}
                  data-ocid="onboarding.join.secondary_button"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Join with Invite Code
                </Button>

                <button
                  type="button"
                  onClick={() => setScreen("request")}
                  className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-ocid="onboarding.request_join.button"
                >
                  Don't have a code?{" "}
                  <span className="font-medium" style={{ color: "#FF4500" }}>
                    Request to Join
                  </span>
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground/60 max-w-xs">
                Your identity is secured by Internet Identity. No passwords, no
                tracking.
              </p>
            </motion.div>
          )}

          {/* Checking existing account */}
          {screen === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-6 py-16"
            >
              <Loader2
                className="w-10 h-10 animate-spin"
                style={{ color: "#FF4500" }}
              />
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Checking your account…
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Just a moment
                </p>
              </div>
            </motion.div>
          )}

          {/* Bootstrap Admin Screen — first ever login */}
          {screen === "bootstrap-admin" && (
            <motion.div
              key="bootstrap-admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.62 0.22 40 / 0.25) 0%, oklch(0.62 0.22 40 / 0.10) 100%)",
                    border: "1px solid oklch(0.62 0.22 40 / 0.35)",
                  }}
                >
                  <Shield className="w-8 h-8" style={{ color: "#FF4500" }} />
                </motion.div>
                <div className="text-center">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    You're the First Admin
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set your name to activate your admin account
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: "oklch(0.62 0.22 40 / 0.15)",
                    color: "#FFA500",
                    border: "1px solid oklch(0.62 0.22 40 / 0.25)",
                  }}
                >
                  <Shield className="w-3 h-3" />
                  Admin Role
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2">
                  <Label className="text-sm font-medium self-start">
                    Profile Picture{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => bootstrapAvatarInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 flex items-center justify-center overflow-hidden transition-opacity hover:opacity-80 cursor-pointer"
                    style={{
                      borderColor: "#FF4500",
                      backgroundColor: "oklch(0.20 0.01 45)",
                    }}
                    data-ocid="onboarding.bootstrap.upload_button"
                    aria-label="Upload profile picture"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera
                        className="w-8 h-8"
                        style={{ color: "#FF4500" }}
                      />
                    )}
                  </button>
                  <input
                    ref={bootstrapAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tap to upload a photo
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="bootstrap-name"
                    className="text-sm font-medium"
                  >
                    Your Name <span style={{ color: "#FF4500" }}>*</span>
                  </Label>
                  <Input
                    id="bootstrap-name"
                    placeholder="e.g. Studio Manager"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setDisplayNameError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleBootstrapAdmin()
                    }
                    className="h-11 rounded-xl"
                    style={{
                      ...inputStyle,
                      borderColor: displayNameError
                        ? "#ef4444"
                        : inputStyle.borderColor,
                    }}
                    {...inputProps}
                    data-ocid="onboarding.bootstrap.input"
                  />
                  {displayNameError && (
                    <p
                      className="text-xs text-red-400"
                      data-ocid="onboarding.bootstrap.error_state"
                    >
                      {displayNameError}
                    </p>
                  )}
                </div>
              </div>

              {profileSetupError && (
                <div
                  className="rounded-lg p-3 border text-sm text-red-400"
                  style={{
                    backgroundColor: "oklch(0.18 0.02 15)",
                    borderColor: "oklch(0.35 0.06 15)",
                  }}
                  data-ocid="onboarding.bootstrap.error_state"
                >
                  {profileSetupError}
                </div>
              )}

              <Button
                onClick={handleBootstrapAdmin}
                disabled={isSubmitting || !displayName.trim()}
                className="w-full h-12 text-base font-semibold rounded-xl"
                style={{ backgroundColor: "#FF4500", color: "white" }}
                data-ocid="onboarding.bootstrap.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating…
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Activate Admin Account
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                data-ocid="onboarding.bootstrap.back_button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to welcome
              </button>
            </motion.div>
          )}

          {/* Invite Code Screen */}
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
                    ...inputStyle,
                    borderColor: inviteError
                      ? "#ef4444"
                      : inputStyle.borderColor,
                  }}
                  {...inputProps}
                  data-ocid="onboarding.invite_code.input"
                />
                {inviteError && (
                  <p
                    className="text-xs text-red-400"
                    data-ocid="onboarding.invite_code.error_state"
                  >
                    {inviteError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleInviteSubmit}
                  disabled={!inviteCode.trim()}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.invite_code.submit_button"
                >
                  Submit Code
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setScreen("request")}
                  className="w-full h-11 rounded-xl text-muted-foreground"
                  data-ocid="onboarding.request_join.secondary_button"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Don't have a code? Request to join
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                data-ocid="onboarding.invite.back_button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </motion.div>
          )}

          {/* Profile Setup Screen */}
          {screen === "profile-setup" && (
            <motion.div
              key="profile-setup"
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
                  <User className="w-7 h-7" style={{ color: "#FF4500" }} />
                </div>
                <div className="text-center">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Set Up Your Profile
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Almost there — just a few details
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2">
                  <Label className="text-sm font-medium self-start">
                    Profile Picture{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 flex items-center justify-center overflow-hidden transition-opacity hover:opacity-80 cursor-pointer"
                    style={{
                      borderColor: "#FF4500",
                      backgroundColor: "oklch(0.20 0.01 45)",
                    }}
                    data-ocid="onboarding.profile.upload_button"
                    aria-label="Upload profile picture"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera
                        className="w-8 h-8"
                        style={{ color: "#FF4500" }}
                      />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-ocid="onboarding.profile.dropzone"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tap to upload a photo
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="display-name" className="text-sm font-medium">
                    Your Name <span style={{ color: "#FF4500" }}>*</span>
                  </Label>
                  <Input
                    id="display-name"
                    placeholder="e.g. John Guitarist"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setDisplayNameError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleProfileSetup()}
                    className="h-11 rounded-xl"
                    style={{
                      ...inputStyle,
                      borderColor: displayNameError
                        ? "#ef4444"
                        : inputStyle.borderColor,
                    }}
                    {...inputProps}
                    data-ocid="onboarding.profile.input"
                  />
                  {displayNameError && (
                    <p
                      className="text-xs text-red-400"
                      data-ocid="onboarding.profile.name.error_state"
                    >
                      {displayNameError}
                    </p>
                  )}
                </div>
              </div>

              {profileSetupError && (
                <div
                  className="rounded-lg p-3 border text-sm text-red-400"
                  style={{
                    backgroundColor: "oklch(0.18 0.02 15)",
                    borderColor: "oklch(0.35 0.06 15)",
                  }}
                  data-ocid="onboarding.profile.error_state"
                >
                  {profileSetupError}
                </div>
              )}

              <Button
                onClick={handleProfileSetup}
                disabled={isSubmitting || !displayName.trim()}
                className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                style={{ backgroundColor: "#FF4500", color: "white" }}
                data-ocid="onboarding.profile.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining the studio…
                  </>
                ) : (
                  "Enter the Studio"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setScreen("invite")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                data-ocid="onboarding.profile.back_button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
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
                  <Label className="text-sm font-medium">Your Name</Label>
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
                    style={inputStyle}
                    {...inputProps}
                    data-ocid="onboarding.request.input"
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
                      style={inputStyle}
                      data-ocid="onboarding.request.select"
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
                    !requestForm.reason
                  }
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-orange"
                  style={{ backgroundColor: "#FF4500", color: "white" }}
                  data-ocid="onboarding.request.submit_button"
                >
                  {isSubmitting ? "Sending…" : "Send Request"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setScreen("invite")}
                  className="w-full h-11 rounded-xl text-muted-foreground"
                  data-ocid="onboarding.request.secondary_button"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Already have an invite code?
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                data-ocid="onboarding.request.back_button"
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
                  will review your request and get in touch with an invite code.
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
                data-ocid="onboarding.request_sent.button"
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
