import BottomNav, { type TabId } from "@/components/BottomNav";
import OnboardingScreen from "@/components/OnboardingScreen";
import SplashScreen from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import AvailabilityPage from "@/pages/AvailabilityPage";
import BandPage from "@/pages/BandPage";
import CalendarPage from "@/pages/CalendarPage";
import ChatsPage from "@/pages/ChatsPage";
import FilesPage from "@/pages/FilesPage";
import HomePage from "@/pages/HomePage";
import PollsPage from "@/pages/PollsPage";
import SettingsPage from "@/pages/SettingsPage";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type AppState = "splash" | "onboarding" | "app" | "checking";

const REGISTERED_CACHE_KEY = "ocs_registered_principal";

function getCachedPrincipal(): string | null {
  try {
    return localStorage.getItem(REGISTERED_CACHE_KEY);
  } catch {
    return null;
  }
}

function setCachedPrincipal(principal: string) {
  try {
    localStorage.setItem(REGISTERED_CACHE_KEY, principal);
  } catch {}
}

function clearCachedPrincipal() {
  try {
    localStorage.removeItem(REGISTERED_CACHE_KEY);
  } catch {}
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("splash");
  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const checkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgVerifiedRef = useRef(false);

  // Advance past splash once animation done AND auth initialised
  useEffect(() => {
    if (!splashDone || isInitializing) return;
    if (identity) {
      const principal = identity.getPrincipal().toString();
      const cached = getCachedPrincipal();
      if (cached === principal) {
        bgVerifiedRef.current = false;
        setConnectError(null);
        setAppState("app");
      } else {
        setAppState("checking");
      }
    } else {
      setConnectError(null);
      setAppState("onboarding");
    }
  }, [splashDone, isInitializing, identity]);

  // Background verification for cached logins
  useEffect(() => {
    if (appState !== "app" || bgVerifiedRef.current || !actor || actorFetching)
      return;
    if (!identity) return;
    const principal = identity.getPrincipal().toString();
    if (getCachedPrincipal() !== principal) return;

    bgVerifiedRef.current = true;
    actor
      .isCallerRegistered()
      .then((registered) => {
        if (!registered) {
          clearCachedPrincipal();
          setConnectError(null);
          setAppState("onboarding");
        }
      })
      .catch(() => {
        // Backend unreachable — stay in app optimistically
      });
  }, [appState, actor, actorFetching, identity]);

  // Sign out if identity disappears while in the app
  useEffect(() => {
    if (appState === "app" && !identity) {
      clearCachedPrincipal();
      setConnectError(null);
      setAppState("onboarding");
    }
  }, [identity, appState]);

  // Hard timeout: if stuck on checking for >10s, bail to onboarding
  useEffect(() => {
    if (appState === "checking") {
      checkingTimeoutRef.current = setTimeout(() => {
        setConnectError("Connection timed out. Please try again.");
        setAppState("onboarding");
      }, 10000);
    } else {
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }
    }
    return () => {
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
      }
    };
  }, [appState]);

  // Run access check once actor is ready (for non-cached logins)
  useEffect(() => {
    if (appState !== "checking") return;

    if (!identity) {
      setConnectError(null);
      setAppState("onboarding");
      return;
    }

    if (actorFetching) return;
    if (!actor) return;

    const checkAccess = async () => {
      try {
        const registered = await withTimeout(actor.isCallerRegistered(), 8000);
        if (registered) {
          const principal = identity.getPrincipal().toString();
          setCachedPrincipal(principal);
          setConnectError(null);
          setAppState("app");
        } else {
          clearCachedPrincipal();
          setConnectError(null);
          setAppState("onboarding");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isStoppedCanister =
          msg.includes("IC0508") ||
          msg.includes("is stopped") ||
          msg.includes("CallContextManager");
        setConnectError(
          isStoppedCanister
            ? "Server temporarily unavailable. Please try again in a moment."
            : msg,
        );
        setAppState("onboarding");
      }
    };

    void checkAccess();
  }, [identity, actor, actorFetching, appState]);

  const handleApproved = () => {
    if (identity) {
      setCachedPrincipal(identity.getPrincipal().toString());
    }
    setConnectError(null);
    setAppState("app");
  };

  return (
    <div
      className="min-h-screen max-w-2xl mx-auto relative"
      style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
    >
      <Toaster position="top-center" />

      {appState === "splash" && (
        <SplashScreen onComplete={() => setSplashDone(true)} />
      )}

      <AnimatePresence>
        {appState === "onboarding" && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            <OnboardingScreen
              onApproved={handleApproved}
              initialError={connectError ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === "checking" && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg mb-2">
                <img
                  src="/assets/uploads/Logo-1-1.png"
                  alt="Old Chapel Studios"
                  className="w-full h-full object-contain"
                />
              </div>
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "#FF4500",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm" style={{ color: "oklch(0.6 0.01 50)" }}>
                Connecting…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === "app" && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            <div className="relative">
              <AnimatePresence mode="wait">
                {activeTab === "home" && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <HomePage />
                  </motion.div>
                )}
                {activeTab === "availability" && (
                  <motion.div
                    key="availability"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <AvailabilityPage />
                  </motion.div>
                )}
                {activeTab === "calendar" && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CalendarPage />
                  </motion.div>
                )}
                {activeTab === "chats" && (
                  <motion.div
                    key="chats"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ChatsPage onChatOpenChange={setChatOpen} />
                  </motion.div>
                )}
                {activeTab === "files" && (
                  <motion.div
                    key="files"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <FilesPage />
                  </motion.div>
                )}
                {activeTab === "polls" && (
                  <motion.div
                    key="polls"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <PollsPage />
                  </motion.div>
                )}
                {activeTab === "band" && (
                  <motion.div
                    key="band"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <BandPage />
                  </motion.div>
                )}
                {activeTab === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SettingsPage />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!chatOpen && (
              <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                chatUnreadCount={0}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
