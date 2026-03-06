import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type CalendarEvent,
  INITIAL_EVENTS,
  getUserById,
} from "@/data/mockData";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Plus,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type CalendarView = "month" | "week" | "day";
type RSVPStatus = "yes" | "no" | "maybe" | null;

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++)
    days.push(new Date(year, month, d));

  return days;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [displayDate, setDisplayDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, RSVPStatus>>({});
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "18:00",
    endDate: "",
    endTime: "20:00",
    allDay: false,
    recurring: "",
  });

  const calDays = getDaysInMonth(
    displayDate.getFullYear(),
    displayDate.getMonth(),
  );

  const getEventsForDay = (date: Date) =>
    events.filter((e) => sameDay(new Date(e.startDate), date));

  const handlePrevMonth = () => {
    setDisplayDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleRSVP = (eventId: string, status: RSVPStatus) => {
    setRsvpStatus((p) => ({ ...p, [eventId]: status }));
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim() || !newEvent.startDate) return;
    const startDT = new Date(
      `${newEvent.startDate}T${newEvent.allDay ? "00:00" : newEvent.startTime}`,
    );
    const endDT = new Date(
      `${newEvent.endDate || newEvent.startDate}T${newEvent.allDay ? "23:59" : newEvent.endTime}`,
    );
    const ev: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      description: newEvent.description,
      startDate: startDT.toISOString(),
      endDate: endDT.toISOString(),
      allDay: newEvent.allDay,
      recurring: newEvent.recurring || undefined,
      rsvp: { yes: 0, no: 0, maybe: 0 },
      creatorId: "user-1",
      color: "#FF4500",
    };
    setEvents((p) => [...p, ev]);
    setNewEvent({
      title: "",
      description: "",
      startDate: "",
      startTime: "18:00",
      endDate: "",
      endTime: "20:00",
      allDay: false,
      recurring: "",
    });
    setShowAddEvent(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Calendar" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {/* View Toggle */}
          <div
            className="flex rounded-xl overflow-hidden border mb-4"
            style={{
              borderColor: "oklch(0.28 0.015 45)",
              backgroundColor: "oklch(0.17 0.01 45)",
            }}
          >
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setView(v)}
                data-ocid={`calendar.${v}.tab`}
                className="flex-1 h-10 text-sm font-medium transition-all capitalize"
                style={{
                  backgroundColor: view === v ? "#FF4500" : "transparent",
                  color: view === v ? "white" : "oklch(0.65 0.015 55)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2
              className="font-bold text-lg"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {MONTHS[displayDate.getMonth()]} {displayDate.getFullYear()}
            </h2>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Calendar Grid — Month View */}
          {view === "month" && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                borderColor: "oklch(0.28 0.015 45)",
              }}
            >
              {/* Day headers */}
              <div className="grid grid-cols-7">
                {DAYS_OF_WEEK.map((d) => (
                  <div
                    key={d}
                    className="text-center py-2 text-xs font-semibold text-muted-foreground"
                    style={{ borderBottom: "1px solid oklch(0.28 0.015 45)" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calDays.map((date, idx) => {
                  const dayEvents = date ? getEventsForDay(date) : [];
                  const isToday = date ? sameDay(date, today) : false;
                  const calKey = date
                    ? date.toISOString().split("T")[0]
                    : `empty-${displayDate.getFullYear()}-${displayDate.getMonth()}-${idx}`;
                  return (
                    <button
                      type="button"
                      key={calKey}
                      className="relative min-h-[64px] p-1 border-b border-r transition-colors text-left w-full"
                      style={{
                        borderColor: "oklch(0.28 0.015 45)",
                        borderRight:
                          (idx + 1) % 7 === 0
                            ? "none"
                            : "1px solid oklch(0.28 0.015 45)",
                        backgroundColor: isToday
                          ? "oklch(0.62 0.22 40 / 0.08)"
                          : "transparent",
                        cursor: dayEvents.length > 0 ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedEvent(dayEvents[0]);
                        }
                      }}
                    >
                      {date && (
                        <>
                          <span
                            className={`text-xs font-medium block w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                              isToday
                                ? "text-white font-bold"
                                : "text-foreground/70"
                            }`}
                            style={{
                              backgroundColor: isToday
                                ? "#FF4500"
                                : "transparent",
                            }}
                          >
                            {date.getDate()}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <button
                                type="button"
                                key={ev.id}
                                className="text-[9px] px-1 rounded-sm text-white truncate font-medium cursor-pointer text-left"
                                style={{ backgroundColor: ev.color }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                title={ev.title}
                              >
                                {ev.title}
                              </button>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] text-muted-foreground pl-1">
                                +{dayEvents.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming events list (week/day fallback or below calendar) */}
          {view !== "month" && (
            <div className="space-y-3">
              {events
                .sort(
                  (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime(),
                )
                .map((event) => (
                  <motion.div
                    key={event.id}
                    className="rounded-xl border p-4 cursor-pointer hover:brightness-105 transition-all"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                      borderLeft: `3px solid ${event.color}`,
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3
                          className="font-bold text-sm"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.startDate).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            },
                          )}
                          {!event.allDay && (
                            <>
                              <Clock className="w-3 h-3 ml-1" />
                              {new Date(event.startDate).toLocaleTimeString(
                                "en-GB",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {event.recurring && (
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {event.rsvp.yes} Yes
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-yellow-500" />
                        {event.rsvp.maybe} Maybe
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        {event.rsvp.no} No
                      </span>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}

          {/* Events list below month calendar */}
          {view === "month" && (
            <div className="mt-4 space-y-2">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
                All Events
              </h3>
              {events
                .sort(
                  (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime(),
                )
                .map((event) => (
                  <motion.div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:brightness-105 transition-all"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {!event.allDay &&
                          ` · ${new Date(event.startDate).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" },
                          )}`}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.rsvp.yes + event.rsvp.maybe} going
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Event FAB */}
      <button
        type="button"
        onClick={() => setShowAddEvent(true)}
        data-ocid="calendar.add_event.button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            key="event-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setSelectedEvent(null)
            }
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
                borderLeft: `4px solid ${selectedEvent.color}`,
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              <div className="flex items-start justify-between">
                <h2
                  className="font-black text-xl flex-1 pr-4"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {selectedEvent.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedEvent.startDate).toLocaleDateString(
                    "en-GB",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </div>
                {!selectedEvent.allDay && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedEvent.startDate).toLocaleTimeString(
                      "en-GB",
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    —{" "}
                    {new Date(selectedEvent.endDate).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                )}
                {selectedEvent.recurring && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Repeats {selectedEvent.recurring}
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {selectedEvent.description}
                </p>
              )}

              {/* RSVP */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Are you going?
                </p>
                <div className="flex gap-2">
                  {(["yes", "no", "maybe"] as const).map((status) => {
                    const myStatus = rsvpStatus[selectedEvent.id];
                    const count =
                      selectedEvent.rsvp[status] +
                      (myStatus === status ? 1 : 0);
                    return (
                      <button
                        type="button"
                        key={status}
                        onClick={() =>
                          handleRSVP(
                            selectedEvent.id,
                            myStatus === status ? null : status,
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border"
                        style={{
                          backgroundColor:
                            myStatus === status
                              ? status === "yes"
                                ? "oklch(0.55 0.17 142 / 0.2)"
                                : status === "no"
                                  ? "oklch(0.55 0.22 22 / 0.2)"
                                  : "oklch(0.65 0.18 60 / 0.2)"
                              : "transparent",
                          borderColor:
                            myStatus === status
                              ? status === "yes"
                                ? "oklch(0.55 0.17 142 / 0.4)"
                                : status === "no"
                                  ? "oklch(0.55 0.22 22 / 0.4)"
                                  : "oklch(0.65 0.18 60 / 0.4)"
                              : "oklch(0.28 0.015 45)",
                          color:
                            status === "yes"
                              ? "#22C55E"
                              : status === "no"
                                ? "#EF4444"
                                : "#FFA500",
                        }}
                      >
                        {status === "yes"
                          ? "✅"
                          : status === "no"
                            ? "❌"
                            : "🤔"}{" "}
                        {status.charAt(0).toUpperCase() + status.slice(1)} (
                        {count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div
            key="add-event"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setShowAddEvent(false)
            }
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Add Event
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddEvent(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Event title…"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent((p) => ({ ...p, title: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <Textarea
                  placeholder="Description…"
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent((p) => ({ ...p, description: e.target.value }))
                  }
                  className="rounded-xl text-sm resize-none"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    id="allday"
                    checked={newEvent.allDay}
                    onCheckedChange={(v) =>
                      setNewEvent((p) => ({ ...p, allDay: v }))
                    }
                  />
                  <Label htmlFor="allday" className="text-sm">
                    All day
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) =>
                        setNewEvent((p) => ({
                          ...p,
                          startDate: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl text-sm"
                      style={{
                        backgroundColor: "oklch(0.20 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  {!newEvent.allDay && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) =>
                          setNewEvent((p) => ({
                            ...p,
                            startTime: e.target.value,
                          }))
                        }
                        className="h-11 rounded-xl text-sm"
                        style={{
                          backgroundColor: "oklch(0.20 0.01 45)",
                          borderColor: "oklch(0.28 0.015 45)",
                          colorScheme: "dark",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => setShowAddEvent(false)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEvent}
                  disabled={!newEvent.title.trim() || !newEvent.startDate}
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  Add Event
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
