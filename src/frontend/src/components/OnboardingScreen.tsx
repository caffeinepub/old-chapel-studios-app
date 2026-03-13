import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Screen = "home" | "setup" | "checking";

interface Props {
  onApproved: () => void;
}

export default function OnboardingScreen({ onApproved }: Props) {
  const { login, isLoggingIn, identity } = useInternetIdentity();
  const { actor } = useActor();
  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  const [screen, setScreen] = useState<Screen>("home");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pendingAction = useRef<"login" | "signup" | null>(null);

  useEffect(() => {
    if (!identity || !actor || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    runCheck(action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, actor]);

  async function runCheck(action: "login" | "signup") {
    setScreen("checking");
    setError("");
    setLoading(true);
    try {
      const a = actorRef.current!;
      const registered = await a.isCallerRegistered();

      if (action === "login") {
        if (registered) {
          onApproved();
        } else {
          setError("No account found. Please sign up.");
          setScreen("home");
        }
      } else {
        if (registered) {
          onApproved();
        } else {
          setScreen("setup");
        }
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setScreen("home");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(action: "login" | "signup") {
    setError("");
    if (identity && actor) {
      runCheck(action);
    } else {
      pendingAction.current = action;
      await login();
    }
  }

  async function handleRegister() {
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Use open registration — no invite code needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await actorRef.current!.register(displayName.trim(), null);
      onApproved();
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isLoggingIn;

  return (
    <div
      data-ocid="onboarding.page"
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: "#FF4500" }}>
            Old Chapel Studios
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.6 0.01 50)" }}>
            Community hub
          </p>
        </div>

        {/* Checking */}
        {screen === "checking" && (
          <div
            data-ocid="onboarding.loading_state"
            className="flex justify-center py-8"
          >
            <Loader2
              className="animate-spin"
              style={{ color: "#FF4500" }}
              size={32}
            />
          </div>
        )}

        {/* Home */}
        {screen === "home" && (
          <div className="space-y-3">
            <Button
              data-ocid="onboarding.login.primary_button"
              onClick={() => handleAuth("login")}
              disabled={busy}
              className="w-full font-semibold text-white"
              style={{ backgroundColor: "#FF4500" }}
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : "Log In"}
            </Button>
            <Button
              data-ocid="onboarding.signup.secondary_button"
              onClick={() => handleAuth("signup")}
              disabled={busy}
              variant="outline"
              className="w-full font-semibold border"
              style={{
                borderColor: "#FF4500",
                color: "#FF4500",
                backgroundColor: "transparent",
              }}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Sign Up"
              )}
            </Button>
            {error && (
              <p
                data-ocid="onboarding.error_state"
                className="text-sm text-red-400 text-center"
              >
                {error}
              </p>
            )}
          </div>
        )}

        {/* Setup — new user, enter display name */}
        {screen === "setup" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Create Account</h2>
            <div className="space-y-1">
              <Label className="text-white text-sm">Your Name</Label>
              <Input
                data-ocid="onboarding.display_name.input"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-transparent border-white/20 text-white placeholder:text-white/30"
                autoFocus
              />
            </div>
            {error && (
              <p
                data-ocid="onboarding.setup.error_state"
                className="text-sm text-red-400"
              >
                {error}
              </p>
            )}
            <Button
              data-ocid="onboarding.setup.submit_button"
              onClick={handleRegister}
              disabled={busy}
              className="w-full font-semibold text-white"
              style={{ backgroundColor: "#FF4500" }}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Create Account"
              )}
            </Button>
            <Button
              data-ocid="onboarding.setup.cancel_button"
              variant="ghost"
              onClick={() => {
                setScreen("home");
                setError("");
              }}
              className="w-full text-white/50"
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
