# Old Chapel Studios App

## Current State
The Availability page shows a weekly grid with per-day status (available/partial/booked/closed) for each room. The Rooms section at the bottom of the page shows simple room cards with just the room name and emoji. There is no way to display or manage specific free time slots per room.

## Requested Changes (Diff)

### Add
- Backend: `FreeTimeSlot` type with fields: id, room, dayLabel (e.g. "Mon 18 Mar"), timeStart (e.g. "10:00"), timeEnd (e.g. "14:00"), note (optional)
- Backend: `addFreeTimeSlot(room, dayLabel, timeStart, timeEnd, note)` — admin only
- Backend: `removeFreeTimeSlot(id)` — admin only
- Backend: `getFreeTimeSlots()` — public query, returns all slots
- Frontend: Under each room card on the Availability page, show a list of upcoming free time slots for that room
- Frontend: Admins see an "Add time slot" button per room that opens a small inline form (day, start time, end time, optional note) to add a slot
- Frontend: Admins see a remove (×) button on each slot to delete it

### Modify
- Existing room cards at the bottom of the Availability page expanded to show the free time slots list below the room name

### Remove
- Nothing removed

## Implementation Plan
1. Add `FreeTimeSlot` type and storage to backend (`main.mo`)
2. Add `addFreeTimeSlot`, `removeFreeTimeSlot`, `getFreeTimeSlots` methods to backend
3. Regenerate `backend.d.ts` bindings
4. Update `AvailabilityPage.tsx` to fetch and display free time slots per room, with admin controls
