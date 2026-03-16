# Old Chapel Studios App

## Current State
The app has a fully functional group chat across multiple channels. Messages show sender identity (own messages on right in orange, others on left with name/initials). Emoji reactions and tappable user profiles exist. Admin user management (view, ban, remove members) is available in Settings for the hardcoded admin principal. There is a `deleteMessage` backend function that only lets the author delete their own messages.

## Requested Changes (Diff)

### Add
- `adminDeleteMessage(messageId: Nat)` backend function: admin-only, deletes any message regardless of author. Already added to `main.mo` and `backend.ts`.
- Frontend: When the current user is admin, show a small trash/delete icon on every message bubble (visible on hover/tap). Tapping it calls `adminDeleteMessage` and removes the message from the local list immediately.
- The delete icon should be subtle and unobtrusive -- not shown to regular members at all.

### Modify
- Chat message components to conditionally render the admin delete button based on `isAdmin` state.

### Remove
- Nothing removed.

## Implementation Plan
1. In the chat UI (wherever messages are rendered), read the existing `isAdmin` / user role state.
2. For each message bubble, if admin: render a small trash icon button (e.g. top-right of message, subtle red).
3. On click: call `backend.adminDeleteMessage(BigInt(message.id))`, then remove the message from local state.
4. Show a brief loading/disabled state on the button while the call is in flight to prevent double-taps.
5. No confirmation dialog needed -- admin action should be fast.
