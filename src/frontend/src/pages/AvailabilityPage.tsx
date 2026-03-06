import AppHeader from "@/components/AppHeader";
import {
  type AvailabilitySlot,
  DAYS,
  INITIAL_AVAILABILITY,
  ROOMS,
} from "@/data/mockData";
import { ChevronLeft, ChevronRight, ExternalLink, Info } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const STATUS_COLORS: Record<AvailabilitySlot["status"], string> = {
  available: "#22C55E",
  partial: "#FFA500",
  booked: "#FF4500",
  closed: "oklch(0.28 0.015 45)",
};

const STATUS_LABELS: Record<AvailabilitySlot["status"], string> = {
  available: "Available",
  partial: "Partial",
  booked: "Booked",
  closed: "Closed",
};

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function AvailabilityPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Studio Availability" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              data-ocid="availability.prev_week.button"
              className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            <div className="text-center">
              <p
                className="font-bold text-sm"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {weekOffset === 0
                  ? "This Week"
                  : weekOffset === 1
                    ? "Next Week"
                    : weekOffset === -1
                      ? "Last Week"
                      : `Week of ${weekDates[0].toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {weekDates[0].toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                —{" "}
                {weekDates[6].toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              data-ocid="availability.next_week.button"
              className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Urgent alert */}
          {weekOffset === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 p-3 rounded-xl"
              style={{
                backgroundColor: "oklch(0.62 0.22 40 / 0.12)",
                border: "1px solid oklch(0.62 0.22 40 / 0.3)",
              }}
            >
              <span className="text-lg">🟢</span>
              <p className="text-sm font-semibold" style={{ color: "#FF4500" }}>
                Room 1 is free tonight!
              </p>
            </motion.div>
          )}

          {/* Availability Grid */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "oklch(0.17 0.01 45)",
              borderColor: "oklch(0.28 0.015 45)",
            }}
          >
            {/* Header row */}
            <div
              className="grid"
              style={{ gridTemplateColumns: "120px repeat(7, 1fr)" }}
            >
              <div
                className="p-3 text-xs font-semibold text-muted-foreground"
                style={{
                  borderBottom: "1px solid oklch(0.28 0.015 45)",
                  borderRight: "1px solid oklch(0.28 0.015 45)",
                }}
              >
                Room
              </div>
              {weekDates.map((date, i) => (
                <div
                  key={DAYS[i]}
                  className="p-2 text-center border-b"
                  style={{
                    borderColor: "oklch(0.28 0.015 45)",
                    borderRight:
                      i < 6 ? "1px solid oklch(0.28 0.015 45)" : "none",
                    backgroundColor:
                      i === new Date().getDay() - 1 && weekOffset === 0
                        ? "oklch(0.62 0.22 40 / 0.08)"
                        : "transparent",
                  }}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {DAYS[i]}
                  </p>
                  <p className="text-xs font-bold text-foreground/70 mt-0.5">
                    {date.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Room rows */}
            {ROOMS.map((room, roomIdx) => (
              <div
                key={room}
                className="grid"
                style={{ gridTemplateColumns: "120px repeat(7, 1fr)" }}
              >
                <div
                  className="p-3 flex flex-col justify-center"
                  style={{
                    borderBottom:
                      roomIdx < ROOMS.length - 1
                        ? "1px solid oklch(0.28 0.015 45)"
                        : "none",
                    borderRight: "1px solid oklch(0.28 0.015 45)",
                  }}
                >
                  <p className="text-xs font-semibold text-foreground">
                    {room.split(" ")[0]} {room.split(" ")[1]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {room.includes("Rehearsal")
                      ? "Rehearsal"
                      : room.includes("Recording")
                        ? "Recording"
                        : "Control"}
                  </p>
                </div>

                {INITIAL_AVAILABILITY[room].map((slot, dayIdx) => (
                  <div
                    key={`${room}-${DAYS[dayIdx]}`}
                    className="flex flex-col items-center justify-center p-2 gap-1"
                    style={{
                      borderBottom:
                        roomIdx < ROOMS.length - 1
                          ? "1px solid oklch(0.28 0.015 45)"
                          : "none",
                      borderRight:
                        dayIdx < 6 ? "1px solid oklch(0.28 0.015 45)" : "none",
                    }}
                    title={`${room} — ${DAYS[dayIdx]}: ${slot.note || STATUS_LABELS[slot.status]}`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: STATUS_COLORS[slot.status],
                        opacity: slot.status === "closed" ? 0.3 : 1,
                      }}
                    />
                    {slot.note && (
                      <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-1">
                        {slot.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      STATUS_COLORS[status as AvailabilitySlot["status"]],
                    opacity: status === "closed" ? 0.3 : 1,
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Book Now CTA */}
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="https://old-chapel-leeds.jammed.app/bookings#/login"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="availability.book_now.button"
              className="flex items-center justify-center gap-2 w-full h-14 rounded-xl text-base font-bold text-white shadow-orange transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: "#FF4500" }}
            >
              <ExternalLink className="w-5 h-5" />
              View Full Calendar & Book Now
            </a>

            {/* Note */}
            <div
              className="flex gap-2 p-3 rounded-xl"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
              }}
            >
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                For real-time availability and to book, log in to{" "}
                <strong className="text-foreground">Jammed</strong> — all
                bookings are managed securely there. This view is a summary
                only.
              </p>
            </div>
          </div>

          {/* Rooms info */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {ROOMS.map((room) => (
              <div
                key={room}
                className="rounded-xl p-3 border flex items-center gap-3"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
                >
                  {room.includes("Rehearsal")
                    ? "🎸"
                    : room.includes("Recording")
                      ? "🎙️"
                      : "🎛️"}
                </div>
                <div>
                  <p className="text-sm font-semibold">{room}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.includes("Rehearsal")
                      ? "Full backline, PA, 4-piece drum kit"
                      : room.includes("Recording")
                        ? "Isolation booths, acoustic treatment"
                        : "DAW, full monitoring, mixing desk"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
