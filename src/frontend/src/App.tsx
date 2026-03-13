import BottomNav, { type TabId } from "@/components/BottomNav";
import OnboardingScreen from "@/components/OnboardingScreen";
import SplashScreen from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import AvailabilityPage from "@/pages/AvailabilityPage";
import CalendarPage from "@/pages/CalendarPage";
import ChatsPage from "@/pages/ChatsPage";
import FilesPage from "@/pages/FilesPage";
import HomePage from "@/pages/HomePage";
import PollsPage from "@/pages/PollsPage";
import SettingsPage from "@/pages/SettingsPage";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type AppState = "splash" | "onboarding" | "app" | "checking";

export default function App() {
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const { identity, isInitializing } = useInternetIdentity();
  const { actor } = useActor();

  const handleSplashComplete = () => {
    setAppState(
      isInitializing
        ? "splash"
        : identity
          ? ("checking" as AppState)
          : "onboarding",
    );
  };

  useEffect(() => {
    if (appState === "app" && !identity) {
      setAppState("onboarding");
    }
  }, [identity, appState]);

  useEffect(() => {
    if (appState === "splash" || appState === "app") return;
    if (!identity) {
      setAppState("onboarding");
      return;
    }
    if (!actor) {
      setAppState("onboarding");
      return;
    }

    const checkAccess = async () => {
      try {
        const approved = await actor.isCallerApproved();
        if (approved) {
          setAppState("app");
        } else {
          setAppState("onboarding");
        }
      } catch {
        setAppState("onboarding");
      }
    };

    checkAccess();
  }, [identity, actor, appState]);

  const handleApproved = () => {
    setAppState("app");
  };

  return (
    <div
      className="min-h-screen max-w-2xl mx-auto relative"
      style={{ backgroundColor: "oklch(0.13 0.008 50)" }}
    >
      <Toaster position="top-center" />

      {appState === "splash" && (
        <SplashScreen onComplete={handleSplashComplete} />
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
            <OnboardingScreen onApproved={handleApproved} />
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
                    <ChatsPage />
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

            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              chatUnreadCount={0}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
