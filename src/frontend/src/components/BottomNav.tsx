import {
  BarChart3,
  Calendar,
  CalendarDays,
  FolderOpen,
  Home,
  MessageSquare,
  Settings,
} from "lucide-react";
import { motion } from "motion/react";

export type TabId =
  | "home"
  | "availability"
  | "calendar"
  | "chats"
  | "files"
  | "polls"
  | "settings";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  chatUnreadCount?: number;
}

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  ocid: string;
}[] = [
  { id: "home", label: "Home", icon: Home, ocid: "nav.home.tab" },
  {
    id: "availability",
    label: "Rooms",
    icon: CalendarDays,
    ocid: "nav.availability.tab",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    ocid: "nav.calendar.tab",
  },
  { id: "chats", label: "Chats", icon: MessageSquare, ocid: "nav.chats.tab" },
  { id: "files", label: "Files", icon: FolderOpen, ocid: "nav.files.tab" },
  { id: "polls", label: "Polls", icon: BarChart3, ocid: "nav.polls.tab" },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    ocid: "nav.settings.tab",
  },
];

export default function BottomNav({
  activeTab,
  onTabChange,
  chatUnreadCount = 0,
}: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        backgroundColor: "oklch(0.10 0.008 40)",
        borderTop: "1px solid oklch(0.28 0.015 45)",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-ocid={tab.ocid}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all"
              style={{ minWidth: 0 }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: "#FF4500" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon container */}
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

                {/* Unread badge for chats */}
                {tab.id === "chats" && chatUnreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
                    style={{ backgroundColor: "#FF4500" }}
                  >
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </div>

              {/* Label */}
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
      </div>
    </nav>
  );
}
