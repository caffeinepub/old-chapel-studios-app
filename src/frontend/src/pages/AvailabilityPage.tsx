import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActor } from "@/hooks/useActor";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ROOMS = ["Room 1", "Room 2", "Room 3"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SlotStatus = "available" | "partial" | "booked" | "closed";

type AvailabilityState = Record<string, SlotStatus[]>;

interface FreeTimeSlot {
  id: bigint;
  room: string;
  dayLabel: string;
  timeStart: string;
  timeEnd: string;
  note: string;
}

const STATUS_COLORS: Record<SlotStatus, string> = {
  available: "#22C55E",
  partial: "#FFA500",
  booked: "#FF4500",
  closed: "oklch(0.28 0.015 45)",
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  available: "Available",
  partial: "Partial",
  booked: "Booked",
  closed: "Closed",
};

const STATUS_CYCLE: SlotStatus[] = ["available", "partial", "booked", "closed"];

const DEFAULT_STATUS: SlotStatus = "closed";

function getDefaultAvailability(): AvailabilityState {
  const state: AvailabilityState = {};
  for (const room of ROOMS) {
    state[room] = Array(7).fill(DEFAULT_STATUS);
  }
  return state;
}

function statusToSlot(
  room: string,
  dayOfWeek: number,
  status: SlotStatus,
): {
  room: string;
  dayOfWeek: bigint;
  hourStart: bigint;
  hourEnd: bigint;
  available: boolean;
} | null {
  if (status === "closed") return null;
  return {
    room,
    dayOfWeek: BigInt(dayOfWeek),
    hourStart: 0n,
    hourEnd: status === "partial" ? 12n : 24n,
    available: status !== "booked",
  };
}

function slotToStatus(
  slot: { available: boolean; hourEnd: bigint } | undefined,
): SlotStatus {
  if (!slot) return "closed";
  if (!slot.available) return "booked";
  return slot.hourEnd <= 12n ? "partial" : "available";
}

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

interface AddSlotFormState {
  dayLabel: string;
  timeStart: string;
  timeEnd: string;
  note: string;
}

const EMPTY_FORM: AddSlotFormState = {
  dayLabel: "",
  timeStart: "",
  timeEnd: "",
  note: "",
};

function RoomSlotsCard({
  room,
  slots,
  isAdmin,
  onAdd,
  onRemove,
}: {
  room: string;
  slots: FreeTimeSlot[];
  isAdmin: boolean;
  onAdd: (room: string, form: AddSlotFormState) => Promise<void>;
  onRemove: (id: bigint) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddSlotFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<bigint | null>(null);

  const roomSlots = slots
    .filter((s) => s.room === room)
    .sort((a, b) => {
      if (a.dayLabel < b.dayLabel) return -1;
      if (a.dayLabel > b.dayLabel) return 1;
      if (a.timeStart < b.timeStart) return -1;
      if (a.timeStart > b.timeStart) return 1;
      return 0;
    });

  const handleSubmit = async () => {
    if (
      !form.dayLabel.trim() ||
      !form.timeStart.trim() ||
      !form.timeEnd.trim()
    ) {
      toast.error("Day, start time and end time are required");
      return;
    }
    setSaving(true);
    try {
      await onAdd(room, form);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: bigint) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: "oklch(0.17 0.01 45)",
        borderColor: "oklch(0.28 0.015 45)",
      }}
    >
      {/* Room header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "oklch(0.28 0.015 45)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: "oklch(0.62 0.22 40 / 0.15)" }}
        >
          🎵
        </div>
        <p className="text-sm font-semibold flex-1">{room}</p>
        {isAdmin && (
          <button
            type="button"
            data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.open_modal_button`}
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: "#FF4500", color: "#fff" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add slot
          </button>
        )}
      </div>

      {/* Add slot form */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 py-3 flex flex-col gap-2.5 border-b"
              style={{
                backgroundColor: "oklch(0.62 0.22 40 / 0.05)",
                borderColor: "oklch(0.28 0.015 45)",
              }}
            >
              <p className="text-xs font-semibold" style={{ color: "#FFA500" }}>
                New Free Time Slot
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Input
                    data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.day.input`}
                    placeholder="Day label, e.g. Mon 18 Mar"
                    value={form.dayLabel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dayLabel: e.target.value }))
                    }
                    className="h-8 text-xs bg-transparent"
                    style={{ borderColor: "oklch(0.28 0.015 45)" }}
                  />
                </div>
                <Input
                  data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.timestart.input`}
                  placeholder="Start, e.g. 10:00"
                  value={form.timeStart}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timeStart: e.target.value }))
                  }
                  className="h-8 text-xs bg-transparent"
                  style={{ borderColor: "oklch(0.28 0.015 45)" }}
                />
                <Input
                  data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.timeend.input`}
                  placeholder="End, e.g. 14:00"
                  value={form.timeEnd}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timeEnd: e.target.value }))
                  }
                  className="h-8 text-xs bg-transparent"
                  style={{ borderColor: "oklch(0.28 0.015 45)" }}
                />
                <Input
                  data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.note.input`}
                  placeholder="Optional note"
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  className="h-8 text-xs bg-transparent"
                  style={{ borderColor: "oklch(0.28 0.015 45)" }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.submit_button`}
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-8 text-xs font-semibold flex-1"
                  style={{ backgroundColor: "#FF4500", color: "#fff" }}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : null}
                  {saving ? "Saving…" : "Add slot"}
                </Button>
                <Button
                  data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.cancel_button`}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slots list */}
      <div className="px-4 py-3">
        {roomSlots.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No free slots added yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roomSlots.map((slot, idx) => (
              <motion.div
                key={String(slot.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.item.${idx + 1}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "oklch(0.62 0.22 40 / 0.12)",
                  border: "1px solid oklch(0.62 0.22 40 / 0.3)",
                  color: "#FFA500",
                }}
              >
                <span className="font-semibold" style={{ color: "#fff" }}>
                  {slot.dayLabel}
                </span>
                <span style={{ color: "oklch(0.75 0.01 45)" }}>·</span>
                <span>
                  {slot.timeStart} – {slot.timeEnd}
                </span>
                {slot.note && (
                  <>
                    <span style={{ color: "oklch(0.75 0.01 45)" }}>·</span>
                    <span className="text-muted-foreground italic">
                      {slot.note}
                    </span>
                  </>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    data-ocid={`availability.${room.toLowerCase().replace(" ", "")}.delete_button.${idx + 1}`}
                    onClick={() => handleRemove(slot.id)}
                    disabled={removingId === slot.id}
                    className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-500/20 transition-colors flex-shrink-0"
                    style={{ color: "oklch(0.65 0.01 45)" }}
                    title="Remove slot"
                  >
                    {removingId === slot.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [availability, setAvailability] = useState<AvailabilityState>(
    getDefaultAvailability(),
  );
  const [freeSlots, setFreeSlots] = useState<FreeTimeSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { actor } = useActor();
  const weekDates = getWeekDates(weekOffset);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildSlots = useCallback((state: AvailabilityState) => {
    const slots: {
      room: string;
      dayOfWeek: bigint;
      hourStart: bigint;
      hourEnd: bigint;
      available: boolean;
    }[] = [];
    for (const room of ROOMS) {
      for (let d = 0; d < 7; d++) {
        const slot = statusToSlot(room, d, state[room][d]);
        if (slot) slots.push(slot);
      }
    }
    return slots;
  }, []);

  const refreshFreeSlots = useCallback(async () => {
    if (!actor) return;
    try {
      const slots = await (actor as any).getFreeTimeSlots();
      setFreeSlots(slots);
    } catch (_) {
      // silently ignore
    }
  }, [actor]);

  // Load from backend on mount
  useEffect(() => {
    if (!actor) return;
    actor
      .getRoomAvailability()
      .then((raw) => {
        const state = getDefaultAvailability();
        for (const room of ROOMS) {
          for (let d = 0; d < 7; d++) {
            const slot = raw.find(
              (s) => s.room === room && Number(s.dayOfWeek) === d,
            );
            state[room][d] = slotToStatus(slot);
          }
        }
        setAvailability(state);
      })
      .catch(() => {});

    refreshFreeSlots();
  }, [actor, refreshFreeSlots]);

  const cycleStatus = (room: string, dayIdx: number) => {
    if (!isAdmin || !actor) return;
    setAvailability((prev) => {
      const slots = [...prev[room]];
      const current = slots[dayIdx];
      const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
      slots[dayIdx] = STATUS_CYCLE[nextIdx];
      const next = { ...prev, [room]: slots };

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await actor.setRoomAvailability(buildSlots(next));
        } catch (_) {
          // silently ignore
        } finally {
          setSaving(false);
        }
      }, 400);

      return next;
    });
  };

  const handleAddSlot = async (room: string, form: AddSlotFormState) => {
    if (!actor) return;
    try {
      await (actor as any).addFreeTimeSlot(
        room,
        form.dayLabel.trim(),
        form.timeStart.trim(),
        form.timeEnd.trim(),
        form.note.trim(),
      );
      await refreshFreeSlots();
      toast.success("Time slot added");
    } catch (err: any) {
      toast.error(`Failed to add slot: ${err?.message ?? "Unknown error"}`);
      throw err;
    }
  };

  const handleRemoveSlot = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).removeFreeTimeSlot(id);
      await refreshFreeSlots();
      toast.success("Slot removed");
    } catch (err: any) {
      toast.error(`Failed to remove slot: ${err?.message ?? "Unknown error"}`);
      throw err;
    }
  };

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
              data-ocid="availability.pagination_prev"
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
              data-ocid="availability.pagination_next"
              className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Admin hint */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-3 p-2.5 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: "oklch(0.62 0.22 40 / 0.1)",
                border: "1px solid oklch(0.62 0.22 40 / 0.25)",
                color: "#FFA500",
              }}
            >
              ✏️ Admin mode — tap any cell to cycle its availability status
              {saving && (
                <span className="ml-auto text-muted-foreground">Saving…</span>
              )}
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
              style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}
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
                style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}
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
                    {room}
                  </p>
                </div>

                {availability[room].map((status, dayIdx) => (
                  <button
                    type="button"
                    key={`${room}-${DAYS[dayIdx]}`}
                    className="flex flex-col items-center justify-center p-2 gap-1 transition-colors"
                    style={{
                      borderBottom:
                        roomIdx < ROOMS.length - 1
                          ? "1px solid oklch(0.28 0.015 45)"
                          : "none",
                      borderRight:
                        dayIdx < 6 ? "1px solid oklch(0.28 0.015 45)" : "none",
                      cursor: isAdmin ? "pointer" : "default",
                    }}
                    onClick={() => cycleStatus(room, dayIdx)}
                    title={`${room} — ${DAYS[dayIdx]}: ${STATUS_LABELS[status]}${
                      isAdmin ? " (tap to change)" : ""
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 transition-all"
                      style={{
                        backgroundColor: STATUS_COLORS[status],
                        opacity: status === "closed" ? 0.3 : 1,
                        boxShadow: isAdmin
                          ? "0 0 0 2px oklch(0.62 0.22 40 / 0.15)"
                          : "none",
                      }}
                    />
                  </button>
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
                    backgroundColor: STATUS_COLORS[status as SlotStatus],
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

          {/* Free Time Slots per Room */}
          <div className="mt-6">
            <h2
              className="text-sm font-bold mb-3 tracking-wide uppercase"
              style={{ color: "#FFA500" }}
            >
              Free Time Slots
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {ROOMS.map((room) => (
                <RoomSlotsCard
                  key={room}
                  room={room}
                  slots={freeSlots}
                  isAdmin={isAdmin}
                  onAdd={handleAddSlot}
                  onRemove={handleRemoveSlot}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
