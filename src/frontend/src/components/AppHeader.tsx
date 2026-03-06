import { Bell, Music, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface AppHeaderProps {
  title: string;
  onSearchChange?: (query: string) => void;
  notificationCount?: number;
}

export default function AppHeader({
  title,
  onSearchChange,
  notificationCount = 0,
}: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onSearchChange?.(q);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    onSearchChange?.("");
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between h-14 px-4"
        style={{
          backgroundColor: "oklch(0.10 0.008 40 / 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(0.28 0.015 45)",
        }}
      >
        {/* Logo + Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-orange-sm flex-shrink-0">
            <img
              src="/assets/generated/chapel-icon-transparent.dim_512x512.png"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className="font-bold text-base truncate max-w-[180px]"
            style={{
              fontFamily: "'Outfit', sans-serif",
              color: "oklch(0.96 0.008 60)",
            }}
          >
            {title}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5 text-muted-foreground" />
          </button>

          <button
            type="button"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: "#FF4500" }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: "oklch(0.11 0.008 45 / 0.97)" }}
          >
            <div className="flex items-center gap-3 p-4 pt-safe">
              <div
                className="flex-1 flex items-center gap-2 rounded-xl px-3 h-11"
                style={{
                  backgroundColor: "oklch(0.20 0.01 45)",
                  border: "1px solid oklch(0.62 0.22 40)",
                }}
              >
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  placeholder="Search posts, files, chats…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  data-ocid="home.search.input"
                />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            {/* Search results placeholder */}
            <div className="flex-1 p-4">
              {searchQuery ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Searching for "{searchQuery}"…
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Search across posts, files, and chats
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
