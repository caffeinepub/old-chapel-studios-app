import {
  BarChart3,
  Calendar,
  CalendarDays,
  FolderOpen,
  Grid3X3,
  Home,
  MessageSquare,
  Music,
  Settings,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export type TabId =
  | "home"
  | "availability"
  | "calendar"
  | "chats"
  | "files"
  | "polls"
  | "band"
  | "settings";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  chatUnreadCount?: number;
}

type NavItem = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  ocid: string;
};

// 5 primary tabs visible in the bottom bar
const PRIMARY_TABS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, ocid: "nav.home.tab" },
  { id: "chats", label: "Chats", icon: MessageSquare, ocid: "nav.chats.tab" },
  { id: "band", label: "Band", icon: Music, ocid: "nav.band.tab" },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    ocid: "nav.calendar.tab",
  },
];

// 4 items hidden behind "More"
const MORE_TABS: NavItem[] = [
  {
    id: "availability",
    label: "Rooms",
    icon: CalendarDays,
    ocid: "nav.availability.tab",
  },
  { id: "files", label: "Files", icon: FolderOpen, ocid: "nav.files.tab" },
  { id: "polls", label: "Polls", icon: BarChart3, ocid: "nav.polls.tab" },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    ocid: "nav.settings.tab",
  },
];

const MORE_TAB_IDS = new Set<TabId>(MORE_TABS.map((t) => t.id));

export default function BottomNav({
  activeTab,
  onTabChange,
  chatUnreadCount = 0,
}: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_TAB_IDS.has(activeTab);

  const handleTabClick = (id: TabId) => {
    onTabChange(id);
    setMoreOpen(false);
  };

  const handleMoreToggle = () => setMoreOpen((prev) => !prev);

  return (
    <>
      {/* Backdrop for More sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More slide-up sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="fixed bottom-16 left-0 right-0 z-50 max-w-2xl mx-auto rounded-t-2xl px-4 pt-4 pb-6"
            style={{
              backgroundColor: "oklch(0.14 0.012 40)",
              borderTop: "1px solid oklch(0.28 0.015 45)",
            }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-1 rounded-full mx-auto"
                style={{ backgroundColor: "oklch(0.35 0.015 45)" }}
              />
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full"
                style={{ color: "oklch(0.55 0.015 55)" }}
                data-ocid="nav.more.close_button"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3 px-1"
              style={{
                color: "oklch(0.45 0.012 45)",
                fontFamily: "'General Sans', sans-serif",
              }}
            >
              More
            </p>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {MORE_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-ocid={tab.ocid}
                    onClick={() => handleTabClick(tab.id)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all active:scale-95"
                    style={{
                      backgroundColor: isActive
                        ? "oklch(0.20 0.03 40)"
                        : "oklch(0.18 0.01 40)",
                      border: isActive
                        ? "1px solid #FF4500"
                        : "1px solid oklch(0.28 0.015 45)",
                    }}
                  >
                    <Icon
                      className="w-5 h-5 flex-shrink-0"
                      style={{
                        color: isActive ? "#FF4500" : "oklch(0.65 0.015 55)",
                      }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: isActive ? "#FF4500" : "oklch(0.85 0.01 55)",
                        fontFamily: "'General Sans', sans-serif",
                      }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
        style={{
          backgroundColor: "oklch(0.10 0.008 40)",
          borderTop: "1px solid oklch(0.28 0.015 45)",
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-1">
          {/* Primary tabs */}
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.id && !moreOpen;
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                data-ocid={tab.ocid}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all"
                style={{ minWidth: 0 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ backgroundColor: "#FF4500" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <div className="relative">
                  <Icon
                    className="w-5 h-5 transition-all"
                    style={{
                      color: isActive ? "#FF4500" : "oklch(0.55 0.015 55)",
                      filter: isActive
                        ? "drop-shadow(0 0 6px oklch(0.62 0.22 40 / 0.5))"
                        : "none",
                    }}
                  />
                  {tab.id === "chats" && chatUnreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
                      style={{ backgroundColor: "#FF4500" }}
                    >
                      {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                    </span>
                  )}
                </div>

                <span
                  className="text-[10px] font-medium truncate transition-all"
                  style={{
                    color: isActive ? "#FF4500" : "oklch(0.45 0.01 55)",
                    fontFamily: "'General Sans', sans-serif",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={handleMoreToggle}
            data-ocid="nav.more.button"
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all"
            style={{ minWidth: 0 }}
          >
            {/* Active indicator when a "more" tab is current OR when sheet is open */}
            {(moreActive || moreOpen) && (
              <motion.div
                layoutId="nav-active-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: "#FF4500" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            <Grid3X3
              className="w-5 h-5 transition-all"
              style={{
                color:
                  moreActive || moreOpen ? "#FF4500" : "oklch(0.55 0.015 55)",
                filter:
                  moreActive || moreOpen
                    ? "drop-shadow(0 0 6px oklch(0.62 0.22 40 / 0.5))"
                    : "none",
              }}
            />
            <span
              className="text-[10px] font-medium truncate transition-all"
              style={{
                color:
                  moreActive || moreOpen ? "#FF4500" : "oklch(0.45 0.01 55)",
                fontFamily: "'General Sans', sans-serif",
              }}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
